# Supabase checklist (items 2–5)

Frontend fixes **1** (Join RPC) and **6** (dark mode / ThemeToggle) are already on `main`.
Do these in the Supabase dashboard (or CLI) on your PC.

---

## 2 — Confirm `make_pick` respects `allow_pick_changes` + deadline

1. Supabase → **SQL Editor** → New query.
2. Run:

```sql
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'make_pick';
```

3. Check the body for:
   - deadline / first kick-off check
   - `allow_pick_changes` (if false, block changing an existing pick)

If either is missing, paste the function definition here and we’ll harden it.

---

## 3 — Auth Site URL + Redirect URLs

1. Supabase → **Authentication** → **URL configuration**
2. **Site URL** = your Vercel URL  
   e.g. `https://last-man-standing-xxx.vercel.app`
3. **Redirect URLs** add:
   - `https://your-app.vercel.app/**`
   - `http://localhost:3000/**`
4. Save.

Test: sign up a new email on the **Vercel** site and confirm the email link opens the Vercel domain, not localhost.

---

## 4 — Drop 2-arg `create_competition` overload

1. SQL Editor → open file from repo:  
   `supabase/migrations/20260922_drop_create_competition_2arg.sql`
2. Paste and **Run**.

Safe if the short overload is already gone.

---

## 5 — Edge functions + secrets

1. Deploy the updated **fetch-fixtures** and **live-scores** (standardised `FOOTBALL_DATA_API_KEY`).
2. Edge Function **Secrets**: ensure `FOOTBALL_DATA_API_KEY` is set.
3. Invoke each once:
   - `live-scores` body `{}` → `success: true`
   - `fetch-fixtures` body `{}` → `success: true`
4. After a day of green runs, you can delete the old `FOOTBALL_DATA_TOKEN` secret if you want one name only.

---

## On your PC (after git pull)

```bash
cd last-man-standing
git pull
npm install
npm run dev
```

Or just wait for Vercel to auto-deploy from `main`.
