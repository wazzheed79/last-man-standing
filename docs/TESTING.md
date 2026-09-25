# Testing checklist for friends

This document explains how to deploy a staging instance (or run locally) and the key flows to test. Share this with your testers.

## Quick overview
- Deploy the app to Vercel or use an existing public URL.
- Configure the Supabase project's Auth -> URL redirects to include the staging URL (and `http://localhost:3000` for local testing).
- Run the seed SQL (db/seed-staging.sql) in the Supabase SQL editor to populate a sample competition, players and picks.

## Steps to prepare staging (owner)
1. Deploy to Vercel
   - Connect the GitHub repo `wazzheed79/last-man-standing` to Vercel.
   - Add environment variables in Vercel (see `docs/DEPLOY_VERCEL.md`).
2. Configure Supabase
   - In Supabase → Authentication → Settings:
     - Add the staging URL (e.g. `https://your-app.vercel.app`) to "Site URL" and "Redirect URLs".
     - Add `http://localhost:3000` for local testing as well.
3. Seed data
   - Open Supabase SQL editor for the staging project and paste the contents of `db/seed-staging.sql`. Run it.
4. (Optional) Create test accounts
   - Ask friends to sign up or pre-create accounts in Supabase (Auth → Users) for convenience.

## What to ask testers to check
- Sign up and confirm signup email
- Login and logout
- Forgot password: request a reset email, click the link, set a new password
- Create a competition (if allowed) or join the seeded competition
- Join a league using the join code: STAGE123
- Make picks for the current gameweek, then view the league overview & cycle history
- Export CSV and verify data
- Try the QR code and join link

## Known limitations / notes
- Notifications (reminders) depend on browser support and are device-specific.
- If a tester cannot receive emails, you can manually create users in Supabase Auth and give them a temporary password.
- Avoid using production DB for staging; use a separate Supabase project.

## Reporting bugs
Ask testers to record and send:
- Steps to reproduce
- Browser + OS
- Any console errors (copy/paste)
- Screenshots

