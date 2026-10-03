# Email pick reminders — feature draft

**Status:** Backend mostly built. Not live until Resend + Vault secrets are configured.
**Does not change picks, RLS, or league rules.** Safe to leave dormant.

---

## Goal

Email alive players who have **not** submitted a pick for the current gameweek, before the deadline (first kick-off of that GW).

Windows:

| Window | When |
|--------|------|
| `24h` | First KO is within the next 24 hours |
| `2h` | First KO is within the next 2 hours |

Each player gets **at most one email per window per competition / GW / cycle** (deduped in `pick_reminders_sent`).

---

## What already exists in the repo

### 1. Table — `pick_reminders_sent`

Migration: `supabase/migrations/20260925000000_pick_reminders_sent.sql` (+ UUID fix later).

Tracks successful sends so we never spam the same window twice.

### 2. RPC — `get_pending_pick_reminders()`

Migration: `supabase/migrations/20260927134828_fix_pick_reminders_uuid_and_cycle_checks.sql`

Returns rows for:

- competitions with `status = 'active'`
- first fixture of `current_gameweek` still in the future
- alive `competition_players`
- **no** pick for that GW + cycle
- not already recorded in `pick_reminders_sent` for the active window (`24h` or `2h`)

Includes: `competition_id`, name, `player_id` (auth user id), email, display name, GW, cycle, deadline, `reminder_window`.

**Execute:** `service_role` only.

### 3. Edge function — `send-pick-reminders`

Path: `supabase/functions/send-pick-reminders/index.ts`

- Requires `Authorization: Bearer <service_role JWT>`
- Calls `get_pending_pick_reminders`
- Sends via **Resend** (`RESEND_API_KEY`)
- Inserts into `pick_reminders_sent` **only after** a successful send
- Returns `503` if Resend is not configured (app otherwise unaffected)

### 4. Cron — every 30 minutes

Migration: `supabase/migrations/20260927135559_use_vault_service_role_for_pick_reminders.sql`

`pg_cron` → `pg_net` HTTP POST to the edge function, using Vault secrets:

- `lms_project_url`
- `lms_anon_key`
- `lms_service_role_key`

### 5. Browser reminder (separate)

Overview → **More league tools** → **Enable browser reminder**  
Local device only; does not use email or this pipeline.

---

## Email content (as implemented)

**From (dev default):** `Last Man Standing <notifications@resend.dev>`  
**To:** player account email  

**Subject**

- 24h: `Reminder: Submit your pick for {league} (GW {n})`
- 2h: `URGENT: 2 hours left to submit your pick for {league} (GW {n})`

**Body (HTML)**

- Greeting with name
- League + gameweek
- Deadline time (UTC)
- CTA button → `{SITE_URL}/league/{id}/pick`
- Note: no pick by deadline = eliminated

**Env for links:** `NEXT_PUBLIC_SITE_URL` (fallback in code may be an older Vercel URL — set the live URL in function secrets).

---

## Go-live checklist (owner)

1. **Resend account**
   - Create API key
   - For production: verify your domain and change `from` off `@resend.dev`
2. **Supabase Edge Function secrets**
   - `RESEND_API_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://last-man-standing-wazzheed79.vercel.app` (or final domain)
   - Standard `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (usually injected)
3. **Deploy edge function**
   - `supabase functions deploy send-pick-reminders`
4. **Vault secrets** (for cron)
   - `lms_project_url` = `https://<project-ref>.supabase.co`
   - `lms_anon_key`
   - `lms_service_role_key`
5. **Confirm migrations applied** on the live DB (reminders table + RPC + cron job)
6. **Manual test**
   - Alive player, no pick, fixture KO within 24h
   - Invoke function with service role
   - Expect one email + one row in `pick_reminders_sent`
   - Second invoke: no duplicate for same window

Until step 2–3, cron may run but the function returns **503** and sends nothing. **Picks and the web app keep working.**

---

## Product decisions (draft)

| Topic | Recommendation |
|-------|----------------|
| Opt-in vs all alive | **v1: email all alive non-pickers** (matches “don’t miss deadline”). Opt-out later if needed. |
| Opt-out | Future: `competition_players.email_reminders` boolean default true |
| Open competitions | RPC only targets `status = 'active'`. Extend to `open` if pre-start GW needs reminders. |
| From address | Replace `notifications@resend.dev` once domain is verified |
| Timezone in email | Show local time later; v1 UTC is fine if labelled |
| Unsubscribe link | Add when sending at scale; not required for small private leagues |

---

## Will this affect the app?

| Area | Impact |
|------|--------|
| Make pick / join / results | **None** |
| Overview UI | Unchanged (browser reminder stays as-is) |
| DB load | Light: cron every 30 min + small RPC |
| Cost | Resend free tier is enough for small leagues |
| Failure mode | No key → 503, no emails, no crash |

---

## Optional follow-ups (not required for v1)

1. UI copy on Overview: “Email reminders run automatically when configured by the host.”
2. Opt-out toggle on profile or per league.
3. Align `from` + `NEXT_PUBLIC_SITE_URL` with production domain.
4. Include league join code or “you’re still alive” line in the template.
5. Log failed Resend responses to a `pick_reminders_failed` table for debugging.

---

## One-line summary

**Cron finds alive players with no pick near deadline → Resend emails them → log send so we don’t repeat.**  
Wire `RESEND_API_KEY` + Vault + deploy the function to turn it on.
