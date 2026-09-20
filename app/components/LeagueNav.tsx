'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

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
  const supabase = createClient()

  const base = `/league/${leagueId}`

  const isActive = (suffix: string) => {
    const target = `${base}${suffix}`
    if (suffix === '') return pathname === base
    // exact match, or a sub-route of it (e.g. /pick/confirm), but never a sibling
    // that merely shares the prefix (e.g. /pick vs /picks)
    return pathname === target || pathname.startsWith(`${target}/`)
  }

  const statusColour =
    status === 'active' || status === 'open'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'finished'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-slate-100 text-slate-700'

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {name || 'Loading league...'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {status && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColour}`}>
                  {status}
                </span>
              )}
              {typeof gameweek === 'number' && (
                <span className="text-xs text-slate-500">Gameweek {gameweek}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push('/competitions')}
            className="text-sm text-slate-500 hover:text-slate-800 shrink-0"
          >
            My leagues
          </button>
        </div>

        <nav className="flex gap-1 mt-3 -mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.suffix}
              href={`${base}${tab.suffix}`}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition ${
                isActive(tab.suffix)
                  ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
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
