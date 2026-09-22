# Last Man Standing — Project Status

Last verified against the live Supabase project (`cwebvgnuicfmybjubtwx`) and
the GitHub frontend on **2026-09-22**. This doc is a handover for whichever
AI/session picks this project up next — read it before changing anything,
and update it after you make changes.

## Stack
- Next.js (App Router, Turbopack), no `src/` dir — `app/` and `components/`
  sit directly under the project root.
- Supabase: Postgres + Auth + Edge Functions + pg_cron/pg_net for scheduling.
- Data source: football-data.org API (Premier League, `season=2026`,
  competition id `2021`).
- Frontend is on GitHub: `github.com/wazzheed79/last-man-standing` (private).
  Deployed via Vercel (auto-deploy from `main`).

## ⚠️ Known gaps / things worth fixing next
These are the concrete issues, in priority order:

1. ~~**Frontend pick flow is stale.**~~ **FIXED (2026-09-22).**
   `app/league/[id]/pick/page.tsx` already calls `supabase.rpc('make_pick', {...})`
   and surfaces `error.message`. Postponed-match re-picks and "already used"
   checks go through the RPC.

2. **`create_competition` has two overloads** in the DB:
   `(p_name, p_display_name)` and the fuller version with start_gameweek,
   description, allow_pick_changes, hide_picks_until_ko, etc.
   Two overloads invite silent divergence later.
   **Fix:** drop the short overload. SQL is in `supabase/migrations/20260922_drop_create_competition_2arg.sql`.
   Run it in the Supabase SQL editor.

3. **Two secret names for the same API key.** `fetch-fixtures` reads
   `FOOTBALL_DATA_TOKEN`; `live-scores` reads `FOOTBALL_DATA_API_KEY` (or
   fallbacks). Both work today because both secrets are set to the same value.
   **Fix:** standardize both edge functions on `FOOTBALL_DATA_API_KEY` (keep
   `FOOTBALL_DATA_TOKEN` as a fallback for one release), then remove the
   duplicate secret once confirmed. See notes under Edge Functions below.

4. **No email/push reminders before a pick deadline.** Discussed earlier,
   not built. Would need a scheduled job checking `get_gameweek_deadline()`
   against an email provider (Resend/Postmark) — nothing wired up yet.

## Database schema (`public` schema)

### Tables
- **`competitions`** — `id, name, join_code, created_by, current_gameweek,
  status ('open'|'active'|'finished'|'archived'), season, pick_deadline_type
  (default 'first_kickoff'), created_at, updated_at, winner_player_id,
  finished_at, description, allow_pick_changes, hide_picks_until_ko`
- **`competition_players`** — `id, competition_id, user_id, display_name,
  status ('alive'|'eliminated'), eliminated_gameweek, joined_at`
- **`picks`** — `id, competition_id, player_id, gameweek, team_id, team_name,
  result ('win'|'draw'|'loss'), created_at, status ('pending'|'win'|'draw'|
  'loss'|'postponed'), deadline_exempt (bool)`.
  Unique constraints: `(competition_id, player_id, gameweek)` — one pick per
  gameweek; `(competition_id, player_id, team_id)` — can't reuse a team.
- **`fixtures_cache`** — global (not per-league) cache of PL fixtures:
  `id, season, matchday, match_id, utc_date, status, home_team_id,
  home_team_name, away_team_id, away_team_name, home_score, away_score,
  updated_at, home_team_crest, away_team_crest, is_manual`. Rows with
  `is_manual = true` are protected from being overwritten by the automated
  fetch jobs (edited manually via `/edit-fixtures`, an admin-only page).
- **`app_admins`** — `user_id` only. RLS-locked with no policies (nothing
  can read/write it via PostgREST); only reachable via `is_admin()` or
  direct SQL.

### Key functions (all `SECURITY DEFINER`, `search_path` pinned to `public`)
- **`is_admin()`** — checks `auth.uid()` against `app_admins`.
- **`create_competition(...)`** — creates a competition + auto-joins the creator.
  Starting gameweek defaults to the earliest one whose first kickoff hasn't
  passed yet. **Two overloads still exist — see gap #2.**
- **`join_competition(join_code, display_name?)`**
- **`make_pick(competition_id, team_id, team_name)`** — the trusted path for
  picks (frontend uses this).
- **`advance_gameweek(competition_id)`** — admin-only.
- **`advance_gameweek_internal(competition_id)`** — no admin check; only for
  trusted automation.
- **`upsert_fixture(...)`** — admin-only, used by manual fixture edits.
- **`pick_deadline_ok(competition_id, gameweek)`** — RLS helper.
- **`get_gameweek_deadline(competition_id, gameweek?)`**
- **`eliminate_missed_picks(competition_id, gameweek)`**
- **`process_gameweek_results(competition_id, gameweek?)`**
- **`run_last_man_standing_automation()`** — orchestrator for all competitions.
- Supporting read helpers: `get_fixture_coverage`, `get_team_crest`,
  `is_member_of_competition`, `get_alive_players`, `get_used_teams`,
  `get_competition_summary`, `get_fixtures`, etc.

### RLS — current state
- `fixtures_cache`: SELECT open to `authenticated`; INSERT/UPDATE require `is_admin()`.
- `competitions`: creator can UPDATE/DELETE their own; members can SELECT.
- `competition_players`: DELETE allowed for the creator **or the player themself**.
- `picks`: SELECT for members; INSERT/UPDATE require ownership + deadline OK.
  `make_pick()` is SECURITY DEFINER and is the trusted path.

## Automation (pg_cron + pg_net + Supabase Vault) — LIVE
Three active cron jobs:

| Job | Schedule | What it does |
|---|---|---|
| `last-man-standing-fetch-fixtures` | every 5 min | POSTs to `fetch-fixtures` |
| `last-man-standing-live-scores` | every 2 min | POSTs to `live-scores` |
| `last-man-standing-automation` | every 5 min (offset by 2) | Calls `run_last_man_standing_automation()` |

Vault secrets: `lms_project_url`, `lms_anon_key`.

## Edge Functions
- **`fetch-fixtures`** — full-season pull; secret `FOOTBALL_DATA_TOKEN` (gap #3).
- **`live-scores`** — live/FT scores; secret `FOOTBALL_DATA_API_KEY` / fallbacks (gap #3).
- **`process-results`** — thin wrapper around the automation RPC.
- **`get-standings`** — used by the league Table page.

## Frontend structure
- `/` — home
- `/login`, `/create`, `/join`, `/competitions`
- `/league/[id]/` — Overview, Pick, Fixtures, Results, Table, Players
- `/edit-fixtures`, `/process-results` — admin tools
- Shared: `components/LeagueNav`, `Countdown`, `TeamCrest`, `ThemeToggle`
- `lib/teamNames.ts` — short names for mobile (Man Utd, Spurs, etc.)

## Recent frontend work (already on main)
- Short team names + grid layout on fixtures / pick / results (mobile).
- Countdown to first kick-off on Pick page.
- Creator settings: allow pick changes until KO; hide picks until KO.
- Dark mode (ThemeToggle + CSS variables).
- Overview: alive/out counts, eliminated-by-GW, join link + QR.
- Pick page uses `make_pick` RPC (gap #1 closed).
