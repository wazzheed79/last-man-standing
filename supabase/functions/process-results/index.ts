// process-results edge function
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST required" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const { data: isAdmin, error: adminError } = await userClient.rpc("is_admin");
    if (adminError) throw adminError;
    if (!isAdmin) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    if (body && typeof body.competition_id === "string" && Number.isInteger(body.matchday)) {
      const { data, error } = await supabase.rpc("process_gameweek_results", {
        p_competition_id: body.competition_id,
        p_gameweek: body.matchday,
      });

      if (error) throw error;
      return jsonResponse({ success: true, data, matchday: body.matchday });
    }

    const { data, error } = await supabase.rpc("run_last_man_standing_automation");

    if (error) throw error;

    return jsonResponse({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});

