# Last Man Standing — Project Status

Last verified against the live Supabase project (`cwebvgnuicfmybjubtwx`) and
the local frontend on **2026-09-20**. This doc is a handover for whichever
AI/session picks this project up next — read it before changing anything,
and update it after you make changes.

## Stack
- Next.js (App Router, Turbopack), no `src/` dir — `app/` and `components/`
  sit directly under the project root (`C:\Users\wazzh\last-man-standing`).
- Supabase: Postgres + Auth + Edge Functions + pg_cron/pg_net for scheduling.
- Data source: football-data.org API (Premier League, `season=2026`,
  competition id `2021`).
- Frontend is on GitHub: `github.com/wazzheed79/last-man-standing` (private).
  As of the last commit, the local repo is confirmed **clean** — no
  uncommitted edits pending.

## ⚠️ Known gaps / things worth fixing next
These are the concrete issues found in this review, in priority order:

1. **Frontend pick flow is stale.** `app/league/[id]/pick/page.tsx` does a
   raw `supabase.from('picks').insert()`. There is now a proper `make_pick()`
   RPC (see below) with richer server-side logic — postponed-match re-picks,
   "already used this team" checks with a clean error, deadline checks with
   a clear message. RLS still blocks the raw-insert path once a deadline
   passes, but it has **no concept of postponed fixtures or re-picks**, so a
   player whose pick got postponed currently has no way to change it from
   the UI. **Fix:** switch the Pick page to call `supabase.rpc('make_pick', {...})`
   instead of inserting directly, and surface `error.message` from the RPC
   (it already returns clean, user-facing messages).

2. **`create_competition` has two overloads** in the DB:
   `(p_name, p_display_name)` and `(p_name, p_display_name, p_start_gameweek,
   p_description)`. Both currently contain the same safe gameweek-selection
   logic, so this isn't causing a functional bug today, but two overloads of
   an RPC invites ambiguity later (PostgREST resolves by matching the JSON
   body's keys to parameter names — if a future edit changes one but not the
   other, behavior will silently diverge by which fields the caller sends).
   **Fix:** drop the 2-arg version; the 4-arg one already has defaults for
   both extra params, so nothing calling it with just 2 args needs to change.

3. **Two secret names for the same API key.** `fetch-fixtures` reads
   `FOOTBALL_DATA_TOKEN`; `live-scores` reads `FOOTBALL_DATA_API_KEY` (or
   `FOOTBALL_API_KEY` / `FD_API_KEY` as fallbacks). Both are currently
   working (confirmed via edge function logs — `live-scores` has been
   returning HTTP 200 every 2 minutes), so *some* secret matching one of
   those names is set. Not broken, but confusing for whoever next rotates
   the key and only updates one of them. **Fix:** standardize on one secret
   name and update both functions.

4. **No email/push reminders before a pick deadline.** Discussed earlier,
   not built. Would need a scheduled job checking `get_gameweek_deadline()`
   against an email provider (Resend/Postmark) — nothing wired up yet.

## Database schema (`public` schema)

### Tables
- **`competitions`** — `id, name, join_code, created_by, current_gameweek,
  status ('open'|'active'|'finished'), season, pick_deadline_type
  (default 'first_kickoff'), created_at, updated_at, winner_player_id,
  finished_at, description`
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
  direct SQL. Currently contains one row: `wazzheed@gmail.com`
  (`23a9f4ff-16f7-4364-8574-ac2036fff12f`).

### Key functions (all `SECURITY DEFINER`, `search_path` pinned to `public`)
- **`is_admin()`** — checks `auth.uid()` against `app_admins`.
- **`create_competition(name, display_name?, start_gameweek?, description?)`**
  — creates a competition + auto-joins the creator as the first player.
  Starting gameweek defaults to the earliest one whose first kickoff hasn't
  passed yet (fixed from an earlier bug where it could land on an
  already-started gameweek); can be overridden explicitly, validated
  server-side against `fixtures_cache`. **Two overloads exist — see gap #2.**
- **`join_competition(join_code, display_name?)`**
- **`make_pick(competition_id, team_id, team_name)`** — the "real" way to
  make/change a pick now; not yet called from the frontend (gap #1).
- **`advance_gameweek(competition_id)`** — admin-only (checks `is_admin()`),
  for manual use from the admin UI.
- **`advance_gameweek_internal(competition_id)`** — no admin check, not
  granted to `anon`/`authenticated`; only callable from trusted
  `SECURITY DEFINER` code (i.e. the automation function below). This split
  exists so the automated cron job can advance gameweeks without a logged-in
  admin session.
- **`upsert_fixture(...)`** — admin-only, used by manual fixture edits.
- **`pick_deadline_ok(competition_id, gameweek)`** — RLS helper.
- **`get_gameweek_deadline(competition_id, gameweek?)`** — earliest kickoff
  for a gameweek; `null` if no fixtures loaded yet.
- **`eliminate_missed_picks(competition_id, gameweek)`** — eliminates any
  alive player with no valid pick once the deadline's passed (respects
  `deadline_exempt` and postponed picks).
- **`process_gameweek_results(competition_id, gameweek?)`** — sets
  `picks.status`/`result` from `fixtures_cache`, eliminates players whose
  pick drew or lost.
- **`run_last_man_standing_automation()`** — the orchestrator. Loops every
  `open`/`active` competition, runs the two functions above, cleans up
  stale pending picks for already-eliminated players, detects a winner
  (exactly one alive player + gameweek fully resolved) or a wipe-out (zero
  alive players), and advances the gameweek once everything's resolved.
  **Takes no arguments — safe to run on a schedule for every competition
  at once.**
- **`get_fixture_coverage(season?)`**, **`get_team_crest(team_id)`**,
  **`is_member_of_competition(competition_id)`**, **`get_alive_players`**,
  **`get_used_teams`**, **`get_competition_summary`**, **`get_fixtures`** —
  supporting read helpers.

### RLS — current state (last audited, all confirmed correct)
- `fixtures_cache`: SELECT open to `authenticated`; INSERT/UPDATE require
  `is_admin()`.
- `competitions`: creator can UPDATE/DELETE their own; members can SELECT
  competitions they're in.
- `competition_players`: DELETE allowed for the creator **or the player
  themself** (self-leave, added this session).
- `picks`: SELECT for competition members; INSERT/UPDATE require the caller
  to own the player row (and be `alive`, for INSERT) **and**
  `pick_deadline_ok()`. Note: `make_pick()` bypasses these entirely since
  it's `SECURITY DEFINER` — that's intentional, it's the trusted path.

## Automation (pg_cron + pg_net + Supabase Vault) — LIVE
Three active cron jobs, all using secrets stored in `vault.decrypted_secrets`
(`lms_project_url`, `lms_anon_key`) rather than hardcoded keys:

| Job | Schedule | What it does |
|---|---|---|
| `last-man-standing-fetch-fixtures` | every 5 min | POSTs to `fetch-fixtures` edge function — full PL season sync from football-data.org |
| `last-man-standing-live-scores` | every 2 min | POSTs to `live-scores` edge function — targeted live-score refresh for the current/in-play matchday |
| `last-man-standing-automation` | every 5 min (offset by 2) | Calls `run_last_man_standing_automation()` directly — processes results, eliminates players, advances gameweeks, detects winners |

This means the "make it automatic" ask from earlier in this project's life
**is already built and running** — nobody needs to click "Process Results"
by hand anymore for competitions to progress. The admin `/process-results`
and `/edit-fixtures` pages still exist for manual override/inspection.

## Edge Functions
- **`fetch-fixtures`** (v20) — full-season pull from football-data.org,
  upserts into `fixtures_cache`, skips rows marked `is_manual`. Needs secret
  `FOOTBALL_DATA_TOKEN`.
- **`live-scores`** (v6) — targeted pull for one matchday (defaults to
  whichever matchday currently has non-finished fixtures). Needs one of
  `FOOTBALL_DATA_API_KEY` / `FOOTBALL_API_KEY` / `FD_API_KEY` (see gap #3).
- **`process-results`** (v8) — thin wrapper, just calls
  `run_last_man_standing_automation()`. Still used by the admin
  `/process-results` page for manual triggering.
- **`get-standings`** (v5) — used by the league Table page.

## Frontend structure (`app/` + `components/`, confirmed clean vs GitHub)
- `/` — home (redirects to `/login` if signed out)
- `/login`, `/create`, `/join`, `/competitions` (My Leagues, with
  Archive/Delete for the creator)
- `/league/[id]/` — Overview (shows alive count, description, Leave League)
- `/league/[id]/pick` — **needs the `make_pick()` RPC fix, see gap #1**
- `/league/[id]/fixtures`, `/league/[id]/results`, `/league/[id]/table`
- `/league/[id]/players` — merged "Players & Picks": pick-popularity bars
  for a chosen gameweek at the top, per-player pick history below, with a
  live (unofficial, display-only) red **"Out · lost"/"Out · drew"** badge
  computed from the current gameweek's fixture scores, ahead of the
  automation actually processing it
- `/edit-fixtures`, `/process-results` — global admin tools (not
  league-scoped, since `fixtures_cache` is shared), gated by `is_admin()`
  RPC check + redirect
- `components/LeagueNav.tsx` — tab bar for the league pages
- `components/TeamCrest.tsx` — crest `<img>` with graceful fallback on a
  missing/broken URL

## What was checked this session (no code changes made yet)
- Confirmed via `git status` that the local project has no uncommitted
  changes and matches the last delivered state exactly.
- Read every function definition currently in the database (listed above)
  to confirm what's actually live, rather than relying on memory from
  earlier in this conversation.
- Confirmed the pg_cron jobs are active and confirmed `live-scores` is
  genuinely succeeding via edge function logs (consistent HTTP 200s every
  2 minutes), not just configured-but-failing.
- Diffed the `create_competition` overloads line-by-line — confirmed both
  contain the same (fixed) gameweek-selection logic, so gap #2 is a
  maintainability risk, not a live bug.
- Did **not** yet make any code or migration changes — this session was
  read-only investigation to produce this handover.
