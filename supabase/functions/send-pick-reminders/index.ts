import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://last-man-standing-plum.vercel.app";

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

      let sentSuccess = false;

      if (resendApiKey && player_email) {
        try {
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
          sentSuccess = res.ok;
        } catch (mailErr) {
          console.error(`Failed to send email to ${player_email}:`, mailErr);
        }
      } else {
        // Mock success if key is not configured yet for testing
        console.log(`[DRY-RUN] Reminder to ${player_email} (${reminder_window}) for comp ${competition_id}`);
        sentSuccess = true;
      }

      if (sentSuccess) {
        // Record reminder so player is not spammed again in this window
        const { error: insertErr } = await supabase.from("pick_reminders_sent").insert({
          competition_id,
          player_id,
          gameweek,
          cycle_number,
          reminder_window,
        });

        if (insertErr) {
          console.error("Failed to log pick_reminders_sent:", insertErr);
        }

        results.push({ player_id, email: player_email, reminder_window, status: "sent" });
      }
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
