import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'Last Man Standing is a free Premier League game. No gambling, no entry fee, and no prizes.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Terms of Use</h1>
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
          <h2 className="font-semibold text-slate-900 dark:text-white">A free game</h2>
          <p>
            Last Man Standing is a free game for private Premier League leagues. You pick one team
            each week. If they win, you stay in. If they draw or lose, you are out. You do not pay
            to create an account, join a league, or make a pick.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">No gambling and no prizes</h2>
          <p>
            This is not betting. There is no entry fee, stake, pot, or payout. The app does not
            take money and does not pay money. There are no cash prizes and no other prizes. The
            winner gets bragging rights only.
          </p>
          <p>
            Do not use a league to collect an entry fee or run a prize pool. The optional house-rules
            note is for how your friends want to play, not for money.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Fair use</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>One account each. Don&apos;t share a login or pretend to be someone else.</li>
            <li>Don&apos;t cheat, scrape the app, or try to break it.</li>
            <li>Be decent to the other players in your league.</li>
            <li>Results follow the fixture list. Postponed matches are handled by the game rules.</li>
          </ul>
          <p>
            We can close an account or a league that is used for gambling, abuse, or anything illegal.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Your account</h2>
          <p>
            You can delete your account yourself from{' '}
            <Link href="/account" className="text-blue-600 dark:text-blue-400 hover:underline">
              Account Settings
            </Link>
            . That removes your login, your picks, and your place in each league. A league you
            created stays open if other people are still in it, and another player becomes the
            organiser. A league with nobody else in it is removed. A deleted account cannot be
            restored.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">The service</h2>
          <p>
            The game is provided for fun, as it is. Kick-off times and fixtures can change. We try
            to keep the app available, but we don&apos;t promise it will always be online or free of
            mistakes.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Contact</h2>
          <p>
            Questions about these terms, your account, or the game:{' '}
            <Link href="/feedback" className="text-blue-600 dark:text-blue-400 hover:underline">
              send feedback
            </Link>
            . Please also read the{' '}
            <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Changes</h2>
          <p>
            We may update these terms as the app changes. The date at the top will change when we do.
            Carrying on using the app after that means you accept the new terms.
          </p>
        </section>
      </main>
    </div>
  )
}
