import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getJwtRole(authorization: string | null): string | null {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;
    const payload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="));
    return JSON.parse(decoded).role ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // The gateway validates this JWT; only the scheduled service-role caller
    // is allowed to invoke this privileged email workflow.
    if (getJwtRole(req.headers.get("Authorization")) !== "service_role") {
      return new Response(JSON.stringify({ error: "Service access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://last-man-standing-plum.vercel.app";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Reminder email sending is not configured." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch players who need reminders
    const { data: pending, error: fetchErr } = await supabase.rpc("get_pending_pick_reminders");

    if (fetchErr) {
      console.error("Error fetching pending reminders:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ message: "No pending reminders." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const item of pending) {
      const {
        competition_id,
        competition_name,
        player_id,
        player_email,
        player_name,
        gameweek,
        cycle_number,
        deadline,
        reminder_window,
      } = item;

      const pickUrl = `${siteUrl}/league/${competition_id}/pick`;
      const deadlineDate = new Date(deadline).toLocaleString("en-GB", {
        timeZone: "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const subject =
        reminder_window === "2h"
          ? `URGENT: 2 hours left to submit your pick for ${competition_name} (GW ${gameweek})`
          : `Reminder: Submit your pick for ${competition_name} (GW ${gameweek})`;

      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2>Hey ${player_name || "there"},</h2>
          <p>You haven't locked in your selection for Gameweek ${gameweek} in <strong>${competition_name}</strong>.</p>
          <p>Deadline lock: <strong>${deadlineDate} UTC</strong> (${reminder_window} remaining).</p>
          <div style="margin: 24px 0;">
            <a href="${pickUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Make Your Pick Now
            </a>
          </div>
          <p style="color: #64748b; font-size: 13px;">If you fail to pick in time, you will be eliminated from the competition.</p>
        </div>
      `;

      if (!player_email) {
        console.error(`Skipped reminder without an email address for competition ${competition_id}.`);
        continue;
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Last Man Standing <notifications@resend.dev>",
          to: [player_email],
          subject,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error(`Reminder email provider returned ${res.status}: ${errorBody.slice(0, 500)}`);
        continue;
      }

      // Record only a successfully sent email, so a dry run or failed send
      // never suppresses a later real reminder.
      const { error: insertErr } = await supabase.from("pick_reminders_sent").insert({
        competition_id,
        player_id,
        gameweek,
        cycle_number,
        reminder_window,
      });

      if (insertErr) {
        console.error("Failed to log a sent pick reminder:", insertErr.message);
        continue;
      }

      results.push({ player_id, reminder_window, status: "sent" });
    }

    return new Response(JSON.stringify({ sent_count: results.length, details: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

