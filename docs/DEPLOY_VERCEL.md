Deploying to Vercel (step-by-step)

1) Connect the repo
- Go to https://vercel.com/new and import GitHub repository `wazzheed79/last-man-standing`.
- Select the `main` branch and click Deploy.

2) Environment variables
In the Vercel project settings, add these variables (from your Supabase project):

- NEXT_PUBLIC_SUPABASE_URL = https://YOUR-PROJECT.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon-public-key>

You may also have a server-side key (service role) for scripts — DO NOT expose it to the client.

3) Supabase Auth redirect URLs
- In Supabase dashboard → Authentication → Settings → Redirect URLs, add your Vercel URL, e.g.
  - https://your-app.vercel.app
  - https://your-app.vercel.app/reset-password
  - http://localhost:3000

4) Test the deployment
- Visit the deployed URL and sign up with a test email.
- Confirm the email, log in, and exercise the flows listed in `docs/TESTING.md`.

Notes:
- If emails aren't being delivered, check Supabase project's email configuration.
- For more advanced setups (custom domains, preview deployments), follow Vercel docs.
