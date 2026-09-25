import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { Resend } from "npm:resend"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "")

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: competitions, error: compError } = await supabase
      .from("competitions")
      .select("*")
      .in("status", ["open", "active"])

    if (compError) throw compError

    let totalSent = 0

    for (const comp of competitions ?? []) {
      const gw = Number(comp.current_gameweek ?? 1)
      const cycleNumber = Number(comp.cycle_number ?? 1)

      const { data: fixtureRows } = await supabase
        .from("fixtures_cache")
        .select("utc_date")
        .eq("matchday", gw)
        .order("utc_date", { ascending: true })
        .limit(1)

      if (!fixtureRows || fixtureRows.length === 0) continue

      const deadline = new Date(fixtureRows[0].utc_date).getTime()
      const now = Date.now()
      const remaining = deadline - now

      if (remaining <= 0) continue

      let reminderWindow: "24h" | "2h" | null = null
      if (remaining <= 2 * 60 * 60 * 1000) reminderWindow = "2h"
      else if (remaining <= 24 * 60 * 60 * 1000) reminderWindow = "24h"

      if (!reminderWindow) continue

      const { data: players } = await supabase
        .from("competition_players")
        .select("id, user_id, display_name")
        .eq("competition_id", comp.id)
        .eq("status", "alive")

      for (const player of players ?? []) {
        const { data: existingPick } = await supabase
          .from("picks")
          .select("id")
          .eq("competition_id", comp.id)
          .eq("player_id", player.id)
          .eq("gameweek", gw)
          .eq("cycle_number", cycleNumber)
          .maybeSingle()

        if (existingPick) continue

        const { data: alreadySent } = await supabase
          .from("pick_reminders_sent")
          .select("id")
          .eq("competition_id", comp.id)
          .eq("player_id", player.id)
          .eq("gameweek", gw)
          .eq("cycle_number", cycleNumber)
          .eq("reminder_window", reminderWindow)
          .maybeSingle()

        if (alreadySent) continue

        const { data: userRow } = await supabase.auth.admin.getUserById(player.user_id)
        const email = userRow?.email

        if (!email) continue

        await resend.emails.send({
          from: "Last Man Standing <noreply@yourdomain.com>",
          to: email,
          subject: `Pick reminder: GW${gw} deadline approaching`,
          html: `
            <p>Hello ${player.display_name},</p>
            <p>You are still alive in <strong>${comp.name}</strong> and have not submitted a pick for Gameweek ${gw}.</p>
            <p>Your deadline is approaching. Please make your pick soon.</p>
            <p>League: ${comp.name}</p>
          `,
        })

        const { error: insertError } = await supabase
          .from("pick_reminders_sent")
          .insert({
            competition_id: comp.id,
            player_id: player.id,
            gameweek: gw,
            cycle_number: cycleNumber,
            reminder_window: reminderWindow,
          })

        if (!insertError) {
          totalSent++
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent: totalSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
