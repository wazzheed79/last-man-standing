# Last Man Standing — Project Status Handover

**Last updated:** 2026-09-20  
**Supabase project ref:** `cwebvgnuicfmybjubtwx`  
**Local app (user machine):** `C:\Users\wazzh\last-man-standing`  
**Stack:** Next.js 16 (App Router) + Supabase (Auth, Postgres, Edge Functions, pg_cron)

---

## What the app is

Premier League **Last Man Standing** web app:

- Users create/join leagues with join codes
- Each week pick one team (team cannot be reused in same competition)
- Win advances; draw/loss eliminates
- League hub with tabs: Overview, Players, Pick, Fixtures, Table, Results

---

## Current working features

| Area | Status |
|------|--------|
| Auth (email login) | Working |
| Create / join competition | Working (`create_competition` RPC) |
| My Leagues list + Open → `/league/[id]` | Working |
| League nav tabs | Working |
| Overview / Players / Pick / Fixtures / Table / Results | Working (local files) |
| Players: Alive / Out (red) / Winner badges | Working |
| Soft-archive competitions | Working (`status = archived`) |
| RLS membership helper `is_member_of_competition` | Working |
| `fetch-fixtures` | Active |
| `process-results` + automation cron | Active |
| `get-standings` | Active |
| **`live-scores`** | **Fixed 2026-09-20** — updates scores |
| Cron live-scores every 2 min | Active |

---

## Edge functions (ACTIVE)

1. **fetch-fixtures** — loads PL fixtures into `fixtures_cache`
2. **process-results** — marks picks win/loss/draw, eliminates players
3. **get-standings** — PL table for Table tab
4. **live-scores** — pulls live/FT scores from football-data.org, updates `fixtures_cache`

### Cron jobs

| Job | Schedule | Action |
|-----|----------|--------|
| `last-man-standing-fetch-fixtures` | `*/5 * * * *` | POST fetch-fixtures |
| `last-man-standing-automation` | `2-59/5 * * * *` | `run_last_man_standing_automation()` |
| `last-man-standing-live-scores` | `*/2 * * * *` | POST live-scores |

Vault secrets used by cron: `lms_project_url`, `lms_anon_key`

Edge secrets: `FOOTBALL_DATA_API_KEY` (and `FOOTBALL_DATA_TOKEN` mirror) — set 2026-09-20

---

## Database notes

### Important tables

- `competitions` — status: `open` \| `active` \| `finished` \| `archived`
- `competition_players` — status: `alive` \| `eliminated`
- `picks` — per player/gameweek team + result
- `fixtures_cache` — PL fixtures; columns include `is_manual`, crests, scores

### RLS / relationships

- Embed competitions from players must use:  
  `competitions!competition_players_competition_id_fkey (...)`  
  (second FK is `winner_player_id`)
- Membership checks use `SECURITY DEFINER` function `is_member_of_competition(uuid)` to avoid recursion

### fixtures_cache NOT NULL columns

When inserting, must set: `season`, `matchday`, `match_id`, `utc_date`, `status`, team ids/names, `updated_at`  
**live-scores** now UPDATEs existing rows; INSERT only if missing (with `season: '2026'`)

---

## Latest fix (2026-09-20)

### Problem

1. `live-scores` returned invalid API token / missing key  
2. After key was set, function returned `success: true` but **`updated: 0`** because upsert omitted required `season`

### Fix applied (Supabase only — no local app code required)

1. Set Edge secrets `FOOTBALL_DATA_API_KEY` and `FOOTBALL_DATA_TOKEN`
2. Redeployed `live-scores` to UPDATE by `match_id` (and INSERT with `season` if new)
3. Verified invoke: `{ "success": true, "matchday": 5, "updated": 10 }`

### Files changed in this session

| Location | Change |
|----------|--------|
| Supabase Edge secret | `FOOTBALL_DATA_API_KEY` set |
| Supabase Edge secret | `FOOTBALL_DATA_TOKEN` set (same value) |
| Edge function `live-scores` | Redeployed (UPDATE path + season on insert) |
| `/home/workdir/artifacts/PROJECT_STATUS.md` | Created (this file) |

**No SQL migrations required.**  
**No local Next.js source files changed in this session.**

---

## Local app package artifacts

- `lastman-live-scores.zip` — includes Pick page with LIVE scores UI + live-scores source
- User copies `app/` + `components/` into `C:\Users\wazzh\last-man-standing`
- Keep `.env.local`, `utils/supabase`, `node_modules`

---

## Security note for next AI / user

API keys were shared in chat. Recommend rotating the football-data.org token after setup if this chat is not private. Never commit keys to git.

---

## Suggested next tasks

1. Confirm Pick page on localhost shows LIVE/FT scores (needs zip files installed)
2. Optionally lower live-scores cron frequency off match days to save API quota
3. Creator settings: allow change pick until KO; hide picks until KO
4. QR join code on create
5. Do not hard-delete competitions (archive only) — already soft-archive path exists

---

## Quick health checks

```text
Invoke live-scores body: {} or {"matchday":5}
Expect: success true, updated > 0 when fixtures exist

SELECT matchday, status, count(*) FROM fixtures_cache GROUP BY 1,2 ORDER BY 1,2;
SELECT jobname, schedule, active FROM cron.job;
```
