'use client'

import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">How to Play</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Last Man Standing rules</p>
          </div>
          <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-2">The basics</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Every gameweek, pick one Premier League team you think will{' '}
            <strong>win</strong>. If your team wins, you go through to the next
            round. If they draw or lose, you're out.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-2">You can only use each team once</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Across the whole competition, you can't pick the same team twice.
            Plan ahead — you'll want to save your strongest picks for when you
            need them most.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-2">Deadlines</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Picks close when the first match of that gameweek kicks off — not
            when your own team plays. If you don't make a pick in time,
            you're eliminated for that round, same as picking a losing team.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-2">Postponed matches</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            If your picked team's match gets postponed, that pick doesn't
            count against you — you'll get the chance to pick again for that
            gameweek.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-2">How it ends</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Last player standing wins the league. If everyone gets knocked
            out in the same gameweek, the competition ends with no winner for
            that round — check with whoever's running your league for any
            house rules on ties.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-2">Tips</h2>
          <ul className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-disc list-inside space-y-1">
            <li>Check the "Pick popularity" section on Players &amp; Picks to see what everyone else is going for.</li>
            <li>Home advantage matters — check the Fixtures tab before picking.</li>
            <li>Don't save your best team for a "big" gameweek that never comes — sometimes the safe pick now is worth more than a risky wait.</li>
          </ul>
        </section>

        <Link
          href="/feedback"
          className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline pt-2"
        >
          Got a question or suggestion? Send feedback
        </Link>
      </main>
    </div>
  )
}
