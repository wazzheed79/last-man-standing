# Last Man Standing — AI hand-off brief

**Paste this file (or link the repo + “read PROJECT_STATUS.md”) at the start of any new AI chat.**
Update this doc after meaningful changes.

---

## Identity

| Item | Value |
|------|--------|
| **App** | Premier League Last Man Standing (pick 1 team/week; win advances, draw/loss out; no team reuse) |
| **Repo** | `https://github.com/wazzheed79/last-man-standing` (private) |
| **Live** | `https://last-man-standing-wazzheed79.vercel.app` |
| **Owner** | GitHub `wazzheed79` |
| **Branch** | `main` → auto-deploy on Vercel |

## Stack

- **Next.js 16** App Router (no `src/`), React 19, Tailwind 4, Turbopack  
- **Supabase**: Auth, Postgres, RLS, `SECURITY DEFINER` RPCs, Edge Functions, pg_cron  
- **API**: football-data.org (PL competition `2021`, season `2026`)  
- **Clients**: `@supabase/ssr` browser + server helpers under `utils/supabase/`

## Core product rules

1. One pick per player per gameweek; team cannot be reused in the same **cycle**.  
2. **`make_pick(p_competition_id, p_team_id, p_team_name)`** is the only trusted write path for picks — enforces alive status, deadline, `allow_pick_changes`, team not already used.  
3. **`hide_picks_until_ko`**: other players’ **team names** hidden until first KO of current GW; show “Picked / Hidden until KO”, not “No picks yet”. Own pick always visible.  
4. **Wipeout**: if nobody survives a GW, `handle_wipeout_rollover` starts a new cycle (teams unlock, players revive).  
5. **No max player limit** on join.  
6. Trial: **email confirmation may be OFF** so testers sign up without SMTP; invite flow preserves `?next=/join?code=…` via `/auth/callback`.

## Main routes

| Path | Purpose |
|------|--------|
| `/login` | Login + sign up; supports `?next=` and `?mode=signup` |
| `/auth/callback` | Email/code exchange → redirect to `next` |
| `/join?code=` | Join league (guests redirected to login with code preserved) |
| `/create` | Create competition (start GW, allow changes, hide until KO) |
| `/league/[id]` | Overview (status, join QR, creator pick counts — **no cycle-history matrix**) |
| `/league/[id]/pick` | Make/change pick + form dots |
| `/league/[id]/players` | Line-up, pick history rows, popularity (defaults to **current** GW only) |
| `/league/[id]/table` | PL standings (compact; no clubs/matches/leader summary cards) |
| `/league/[id]/fixtures` | Fixtures |
| `/competitions` | My leagues |
| `/account` | Account settings, push notification trigger, in-app account deletion |

## Key DB objects

**Tables:** `competitions`, `competition_players`, `picks`, `fixtures_cache`, `app_admins`  

**Important columns:**  
`competitions.allow_pick_changes`, `hide_picks_until_ko`, `cycle_number`, `current_gameweek`, `status`  
`picks.cycle_number`, `status`, `result`, `deadline_exempt`  

**RPCs:** `make_pick`, `join_competition`, `create_competition`, `process_gameweek_results`, `handle_wipeout_rollover`, `get_gameweek_deadline`, `delete_own_account`, automation runner  

**Edge functions:** `fetch-fixtures`, `live-scores`, `get-standings` (secrets: prefer `FOOTBALL_DATA_API_KEY`, fallbacks ok)

## Do not break

- RPC arg names use **`p_` prefix** on the client (`p_competition_id`, etc.).  
- Don’t re-add Overview **cycle history** unless asked (Players tab covers history).  
- Don’t show other players’ team names before KO when `hide_picks_until_ko` is on.  
- Don’t commit large binaries / zips (GitHub 100MB limit).  
- Prefer small commits on `main`; Vercel deploys automatically.

## Known gaps (optional later)

- Email deadline reminders (needs Resend/Postmark + confirm-email SMTP for public signups)  
- Optional `max_players` on create  
- Smarter live-scores cron only during match windows  
- PWA icons are SVG-based (fine for many devices)

## How to work in a new chat

```
Repo: https://github.com/wazzheed79/last-man-standing (private, owner wazzheed79)
Read PROJECT_STATUS.md, then: [ONE concrete task].
Push to main when done. Do not rewrite unrelated pages.
```

**Owner workflow:** after each AI session, update the “Last updated” line and any new gaps above.

---

**Last updated:** 2026-11-13  
**Recent UI & Features:** App Store & Google Play readiness — added `capacitor.config.ts`, scaffolded `@capacitor/core` & `@capacitor/cli`, built dedicated `/account` settings route with push notification enablement and in-app account deletion (Apple Guideline 5.1.1(v) compliance), updated `/privacy`, added `delete_own_account` migration, and documented store deployment in `docs/APP_STORE_GUIDE.md`.
