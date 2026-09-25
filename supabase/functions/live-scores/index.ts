import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const PL_COMPETITION_ID = 2021
const LIVE_WINDOW_MS = 2.5 * 60 * 60 * 1000

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Standardized key name (same order as fetch-fixtures)
    const apiKey =
      Deno.env.get("FOOTBALL_DATA_API_KEY") ??
      Deno.env.get("FOOTBALL_DATA_TOKEN") ??
      Deno.env.get("FOOTBALL_API_KEY") ??
      Deno.env.get("FD_API_KEY")

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Football API key not set. Add FOOTBALL_DATA_API_KEY in Edge Function secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    let matchday: number | null = null
    try {
      const body = await req.json()
      if (body?.matchday) matchday = Number(body.matchday)
    } catch {
      // no body is fine
    }

    if (!matchday) {
      const { data: openRows } = await supabase
        .from("fixtures_cache")
        .select("matchday")
        .in("status", [
          "TIMED",
          "SCHEDULED",
          "IN_PLAY",
          "LIVE",
          "PAUSED",
          "HALFTIME",
          "HT",
        ])
        .order("matchday", { ascending: true })
        .limit(1)

      matchday = openRows?.[0]?.matchday ?? null
    }

    if (!matchday) {
      const { data: latest } = await supabase
        .from("fixtures_cache")
        .select("matchday")
        .order("matchday", { ascending: false })
        .limit(1)
      matchday = latest?.[0]?.matchday ?? 1
    }

    const now = Date.now()
    const soonFrom = new Date(now - LIVE_WINDOW_MS).toISOString()
    const soonTo = new Date(now + LIVE_WINDOW_MS).toISOString()

    // Skip the external API call when there are no live or imminent fixtures.
    // This keeps pg_cron polling cheap during quiet periods while still updating
    // normally when a match is near kickoff or already underway.
    const { data: imminentFixtures, error: imminentError } = await supabase
      .from("fixtures_cache")
      .select("match_id, utc_date, status")
      .gte("utc_date", soonFrom)
      .lte("utc_date", soonTo)
      .limit(1)

    if (imminentError) {
      console.error("imminent fixtures query failed", imminentError)
    }

    if (!imminentFixtures || imminentFixtures.length === 0) {
      console.log("No live/imminent fixtures. Skipping football-data.org fetch.", {
        matchday,
        now: new Date(now).toISOString(),
        windowMs: LIVE_WINDOW_MS,
      })

      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "No live or imminent fixtures within the configured window.",
          matchday,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const url =
      `https://api.football-data.org/v4/competitions/${PL_COMPETITION_ID}/matches?matchday=${matchday}`
    const res = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
    })

    if (!res.ok) {
      const text = await res.text()
      return new Response(
        JSON.stringify({
          error: "football-data.org error",
          status: res.status,
          text,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const json = await res.json()
    const matches = json.matches || []

    let updated = 0
    let skipped_manual = 0
    let errors: string[] = []

    for (const m of matches) {
      const match_id = m.id
      const status = m.status || "TIMED"
      let home_score =
        m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? null
      let away_score =
        m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? null

      if (m.score?.fullTime?.home != null) home_score = m.score.fullTime.home
      if (m.score?.fullTime?.away != null) away_score = m.score.fullTime.away

      const { data: existing } = await supabase
        .from("fixtures_cache")
        .select("match_id, is_manual")
        .eq("match_id", match_id)
        .maybeSingle()

      if (existing?.is_manual === true) {
        skipped_manual++
        continue
      }

      // Prefer UPDATE of existing rows (avoids NOT NULL season on insert)
      if (existing) {
        const { error } = await supabase
          .from("fixtures_cache")
          .update({
            status,
            utc_date: m.utcDate,
            home_score,
            away_score,
            home_team_name: m.homeTeam?.name,
            away_team_name: m.awayTeam?.name,
            home_team_crest: m.homeTeam?.crest || null,
            away_team_crest: m.awayTeam?.crest || null,
            updated_at: new Date().toISOString(),
          })
          .eq("match_id", match_id)

        if (error) errors.push(`${match_id}: ${error.message}`)
        else updated++
      } else {
        const { error } = await supabase.from("fixtures_cache").insert({
          match_id,
          season: "2026",
          matchday: m.matchday,
          utc_date: m.utcDate,
          status,
          home_team_id: m.homeTeam?.id,
          home_team_name: m.homeTeam?.name,
          home_team_crest: m.homeTeam?.crest || null,
          away_team_id: m.awayTeam?.id,
          away_team_name: m.awayTeam?.name,
          away_team_crest: m.awayTeam?.crest || null,
          home_score,
          away_score,
          is_manual: false,
          updated_at: new Date().toISOString(),
        })

        if (error) errors.push(`${match_id}: ${error.message}`)
        else updated++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        skipped: false,
        matchday,
        matches: matches.length,
        updated,
        skipped_manual,
        errors: errors.length ? errors.slice(0, 5) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
