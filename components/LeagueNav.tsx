'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

interface LeagueNavProps {
  leagueId: string
  name?: string
  gameweek?: number
  status?: string
}

const tabs = [
  { label: 'Overview', suffix: '' },
  { label: 'Pick', suffix: '/pick' },
  { label: 'Fixtures', suffix: '/fixtures' },
  { label: 'Results', suffix: '/results' },
  { label: 'Players & Picks', suffix: '/players' },
  { label: 'Table', suffix: '/table' },
]

export default function LeagueNav({ leagueId, name, gameweek, status }: LeagueNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const base = `/league/${leagueId}`

  const isActive = (suffix: string) => {
    const target = `${base}${suffix}`
    if (suffix === '') return pathname === base
    return pathname === target || pathname.startsWith(`${target}/`)
  }

  const statusColour =
    status === 'active' || status === 'open'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
      : status === 'finished'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {name || 'Loading league...'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {status && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColour}`}
                >
                  {status}
                </span>
              )}
              {typeof gameweek === 'number' && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Gameweek {gameweek}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <button
              onClick={() => router.push('/competitions')}
              className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              My leagues
            </button>
          </div>
        </div>

        <nav className="flex gap-1 mt-3 -mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.suffix}
              href={`${base}${tab.suffix}`}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition ${
                isActive(tab.suffix)
                  ? 'bg-slate-50 dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
