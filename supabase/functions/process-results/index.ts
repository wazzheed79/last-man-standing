// process-results edge function
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "POST required" }, { status: 405 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    if (body && typeof body.competition_id === "string" && Number.isInteger(body.matchday)) {
      const { data, error } = await supabase.rpc("process_gameweek_results", {
        p_competition_id: body.competition_id,
        p_gameweek: body.matchday,
      });

      if (error) throw error;
      return Response.json({ success: true, data, matchday: body.matchday });
    }

    const { data, error } = await supabase.rpc("run_last_man_standing_automation");

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
});
