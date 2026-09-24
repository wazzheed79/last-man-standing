# Features 1–16 — status

## Shipped in app (deployed via main)

| # | Feature | Status |
|---|---------|--------|
| 2 | Missed-pick warning on Overview | Done — amber banner + Make pick link |
| 5 | PWA Add to Home Screen | Done — `manifest.webmanifest` + metadata + `icon.svg` |
| 6 | Creator pick status (who picked / not) | Done — Overview (creator only) |
| 7 | Export results CSV | Done — Overview → Export CSV |
| 9 | Archive vs delete clarity | Done — clearer confirms + labels |
| 11 | Used teams chips on Pick | Already present |
| 12 | Share status card | Done — Share my status (Web Share / clipboard) |
| 15 | Empty / error states | Improved on Overview, Table, Results, Fixtures |

## Partial / needs your action

| # | Feature | What you need |
|---|---------|----------------|
| 1 | Email deadline reminders | In-app **Enable pick reminders** (browser Notification) is live. True email needs Resend/Postmark API key + edge function — not wired without a key. |
| 3 | Public production URL | Vercel → Project → **Settings → Deployment Protection** → set Production to **None** |
| 4 | Harden `make_pick` | Run SQL in Supabase (see `supabase/migrations/20260922_harden_make_pick.sql`). Paste fails if `$` is escaped — download the file from GitHub and paste, or use SQL Editor upload. |
| 8 | Re-open gameweek | Use existing `/edit-fixtures` + `/process-results` admin tools for postponed matches |
| 10 | Form under teams on Pick | Table already has form; Pick still uses fixtures — can add last-5 dots in a follow-up |
| 13 | Dark mode everywhere | Most pages done; some admin pages may still be light-biased |
| 14 | Edge secret names | Standardise on `FOOTBALL_DATA_API_KEY` in both edge functions (code was provided earlier) |
| 16 | Rate-limit / cron tuning | Optional: lower live-scores frequency midweek in Supabase cron |

## How to test after Vercel deploy

1. Open production URL (after disabling Deployment Protection).
2. Overview: no-pick banner if you have not picked; Enable pick reminders; Export CSV; Share my status.
3. Creator account: “GW pick status” lists who has / has not picked.
4. My Leagues: Archive / Delete copy.
5. Mobile browser → Add to Home Screen (PWA).
