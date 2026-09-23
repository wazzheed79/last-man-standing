 Last Man Standing — Project Status

Last verified against the live Supabase project (`cwebvgnuicfmybjubtwx`) and
the GitHub frontend on **2026-09-23**. This doc is a handover for whichever
AI/session picks this project up next — read it before changing anything,
and update it after you make changes.

## Stack
- Next.js (App Router, Turbopack), no `src/` dir — `app/` and `components/`
  sit directly under the project root.
- Supabase: Postgres + Auth + Edge Functions + pg_cron/pg_net for scheduling.
- Data source: football-data.org API (Premier League, `season=2026`,
  competition id `2021`).
- Frontend is on GitHub: `github.com/wazzheed79/last-man-standing`.
  Deployed via Vercel (auto-deploy from `main`).

## Resolved Gaps
1. **Frontend pick flow is RPC-backed:**
   `app/league/[id]/pick/page.tsx` calls `supabase.rpc('make_pick', {...})`
   and surfaces `error.message`.
2. **`create_competition` overload dropped:**
   Dropped the 2-argument overload via migration `20260922110000_drop_create_competition_2arg.sql`.
3. **Edge Function secrets standardized:**
   Edge Functions tracked in Git (`supabase/functions/`). `fetch-fixtures` and
   `live-scores` both accept `FOOTBALL_DATA_API_KEY` (with token fallback).
4. **Total Wipeout Rollover mechanic implemented:**
   Migration `20260923120000_wipeout_rollover.sql` applied. Multi-cycle support
   tracks resets in `competitions.cycle_number` and `picks.cycle_number`. All
   original players are revived and teams unlocked per cycle.

## Known gaps / things worth fixing next
1. **No email/push reminders before a pick deadline:**
   Needs a scheduled job checking `get_gameweek_deadline()` against an email
   provider (Resend/Postmark) — nothing wired up yet.
2. **Smart cron scheduling / rate-limit protection:**
   `pg_cron` calls `live-scores` every 2 minutes. Consider pausing execution
   outside active match windows to preserve football-data.org quota.

## Database schema (`public` schema)

### Tables
- **`competitions`** — `id, name, join_code, created_by, current_gameweek,
  status ('open'|'active'|'finished'|'archived'), season, pick_deadline_type,
  created_at, updated_at, winner_player_id, finished_at, description,
  allow_pick_changes, hide_picks_until_ko, cycle_number (integer, default 1)`
- **`competition_players`** — `id, competition_id, user_id, display_name,
  status ('alive'|'eliminated'), eliminated_gameweek, joined_at`
- **`picks`** — `id, competition_id, player_id, gameweek, team_id, team_name,
  result ('win'|'draw'|'loss'), created_at, status ('pending'|'win'|'draw'|
  'loss'|'postponed'), deadline_exempt (bool), cycle_number (integer, default 1)`.
  Unique constraints: `(competition_id, player_id, gameweek, cycle_number)` and
  `(competition_id, player_id, team_id, cycle_number)`.
- **`fixtures_cache`** — global cache of PL fixtures: `id, season, matchday,
  match_id, utc_date, status, home_team_id, home_team_name, away_team_id,
  away_team_name, home_score, away_score, updated_at, home_team_crest,
  away_team_crest, is_manual`.
- **`app_admins`** — `user_id` only. RLS-locked.

### Key functions (`SECURITY DEFINER`, `search_path = public`)
- **`make_pick(competition_id, team_id, team_name)`** — trusted path for picks;
  enforces deadlines, player status, and cycle-specific team lockouts.
- **`handle_wipeout_rollover(competition_id, next_gameweek)`** — revives all
  original entrants, increments `cycle_number`, and advances `current_gameweek`.
- **`process_gameweek_results(competition_id, gameweek?)`** — grades picks,
  eliminates losers, and auto-invokes `handle_wipeout_rollover` when 0 players remain.
- **`create_competition(...)`** — single full overload.
- **`join_competition(join_code, display_name?)`**
- **`advance_gameweek_internal(competition_id)`**
- **`get_gameweek_deadline(competition_id, gameweek?)`**
- **`run_last_man_standing_automation()`** — orchestrator for all competitions.

## Automation (pg_cron + pg_net) — LIVE
- `last-man-standing-fetch-fixtures` (every 5 min)
- `last-man-standing-live-scores` (every 2 min)
- `last-man-standing-automation` (every 5 min, offset by 2)
