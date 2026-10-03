'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Last Man Standing</p>
          </div>
          <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: 3 October 2026</p>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Who we are</h2>
          <p>
            Last Man Standing is a Premier League pick&apos;em competition app operated for private leagues.
            This policy explains what data we store and how it is used.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">What we collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Account details you provide (email address, and a display name in each league).</li>
            <li>Competition data: leagues you join or create, weekly team picks, and game results.</li>
            <li>Technical data needed to run the service (session tokens via Supabase Auth).</li>
            <li>Optional browser notification permission if you enable pick reminders on a device.</li>
          </ul>
          <p>
            We do not sell personal data. Fixture and standings data comes from third-party football data providers.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">How we use data</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To run your leagues (picks, eliminations, standings, invites).</li>
            <li>To sign you in and keep your session secure.</li>
            <li>To show optional on-device reminders about pick deadlines (only if you allow notifications).</li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Where data is stored</h2>
          <p>
            Account and competition data are stored in Supabase (authentication and database).
            The app is hosted on Vercel. Providers process data under their own security and privacy terms.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Your choices</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>You can leave a league from the league overview.</li>
            <li>You can sign out at any time from the home screen.</li>
            <li>You can revoke browser notification permission in your device or browser settings.</li>
            <li>To request deletion of your account or data, contact the app operator via the feedback form.</li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Cookies and local storage</h2>
          <p>
            We use authentication cookies/sessions required to keep you signed in, and local storage for preferences
            such as theme (light/dark) and optional reminder settings on this device.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Children</h2>
          <p>
            The app is intended for adults organising private football competitions.
            It is not directed at children under 13.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Changes</h2>
          <p>
            We may update this policy as the app evolves. The &quot;Last updated&quot; date at the top will change when we do.
          </p>
        </section>

        <p className="text-center pt-2">
          <Link href="/feedback" className="text-blue-600 dark:text-blue-400 hover:underline">
            Questions? Send feedback
          </Link>
          {' · '}
          <Link href="/help" className="text-blue-600 dark:text-blue-400 hover:underline">
            How to play
          </Link>
        </p>
      </main>
    </div>
  )
}
