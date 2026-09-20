# Deploy Last Man Standing (so the office can use a real link)

## Option A — Vercel (recommended)

1. Push your project to GitHub (if not already).
2. Go to https://vercel.com → Sign in with GitHub → Import the repo.
3. Framework: Next.js (auto-detected).
4. Add Environment Variables (same as your .env.local):
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
5. Deploy. You get a URL like https://last-man-standing-xxx.vercel.app
6. Share that URL + join codes / QR from the Overview page.

Optional: add a custom domain in Vercel project settings.

## After deploy

- Friends open the Vercel URL (not localhost).
- Create account / log in on that site.
- Join with code or scan QR from Overview.

## Note

Supabase Auth may need your production URL in:
  Authentication → URL configuration → Site URL and Redirect URLs
  e.g. https://your-app.vercel.app/**
