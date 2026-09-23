import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  try { return JSON.stringify(error); } catch { return String(error); }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const token = Deno.env.get("FOOTBALL_DATA_API_KEY") ?? Deno.env.get("FOOTBALL_DATA_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const missing = [
      !token ? "FOOTBALL_DATA_API_KEY" : null,
      !supabaseUrl ? "SUPABASE_URL" : null,
      !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    ].filter(Boolean);

    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    const supabase = createClient(supabaseUrl!, serviceKey!);

    const response = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches?season=2026",
      { headers: { "X-Auth-Token": token! } }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Football API error: HTTP ${response.status} - ${body.slice(0, 500)}`);
    }

    const data = await response.json();
    const matches = data.matches ?? [];

    const { data: manualFixtures, error: manualError } = await supabase
      .from("fixtures_cache")
      .select("match_id")
      .eq("is_manual", true);

    if (manualError) throw manualError;

    const manualIds = new Set((manualFixtures ?? []).map((f: any) => f.match_id));

    const rows = matches
      .filter((m: any) => !manualIds.has(m.id))
      .map((m: any) => ({
        season: "2026",
        matchday: m.matchday,
        match_id: m.id,
        utc_date: m.utcDate,
        status: m.status,
        home_team_id: m.homeTeam.id,
        home_team_name: m.homeTeam.name,
        away_team_id: m.awayTeam.id,
        away_team_name: m.awayTeam.name,
        home_team_crest: m.homeTeam.crest ?? null,
        away_team_crest: m.awayTeam.crest ?? null,
        home_score: m.score?.fullTime?.home ?? null,
        away_score: m.score?.fullTime?.away ?? null,
        is_manual: false,
        updated_at: new Date().toISOString(),
      }));

    let upserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase
        .from("fixtures_cache")
        .upsert(rows.slice(i, i + 100), { onConflict: "match_id" });

      if (error) throw error;
      upserted += Math.min(100, rows.length - i);
    }

    return new Response(JSON.stringify({
      success: true,
      season: 2026,
      received: matches.length,
      upserted,
      skipped_manual: matches.length - rows.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    const message = errorMessage(error);
    console.error("fetch-fixtures error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});