import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What Last Man Standing stores: your email, display name, and picks. No payment details. Free to play.',
}

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
        <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: 13 November 2026</p>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Who we are</h2>
          <p>
            Last Man Standing is a free Premier League prediction game for private leagues. It is
            not a gambling service. We do not take entry fees and we do not pay prizes. This policy
            explains what we store and why.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">What we collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>The email address and password you use to sign in.</li>
            <li>The display name you choose in each league.</li>
            <li>League membership, weekly team picks, and game results.</li>
            <li>Optional notes a league organiser types when they create a league.</li>
            <li>Messages you send on the feedback page.</li>
            <li>A sign-in session, stored so you stay logged in.</li>
          </ul>
          <p>
            We do not collect payment details, because the game is free. We do not sell personal
            data. Fixture and league-table data is fetched by our server from a football data
            provider. That request does not include your name or email.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">How we use data</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To run your leagues: picks, eliminations, standings, and join codes.</li>
            <li>To sign you in and keep your session secure.</li>
            <li>To read and reply to feedback you choose to send.</li>
            <li>
              To send a pick-deadline reminder to your account email, only when reminder emails are
              switched on. These are not marketing emails.
            </li>
            <li>
              To show an on-device reminder before a deadline, only if you allow browser
              notifications.
            </li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Where data is stored</h2>
          <p>
            Accounts and league data are stored with Supabase (sign-in and database). The app is
            hosted on Vercel. If a reminder email is sent, that message goes out through an email
            service (Resend). When a league page shows a join QR code, the join link is sent to a
            QR-code image service so the picture can be drawn.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Your choices</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>You can leave a league from the league overview.</li>
            <li>You can sign out at any time from the home screen.</li>
            <li>You can turn off browser notifications in your device or browser settings.</li>
            <li>
              You can delete your account, picks, and league membership from{' '}
              <Link href="/account" className="text-blue-600 dark:text-blue-400 hover:underline">
                Account Settings
              </Link>
              . A league you created stays open if other people are still in it.
            </li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Cookies and local storage</h2>
          <p>
            We use a sign-in cookie so you stay logged in. This browser also stores your theme
            (light or dark) and, if you turn them on, reminder settings for this device.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Children</h2>
          <p>
            The app is a free football prediction game. It is not directed at children under 13.
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
          <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
            Terms of Use
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
