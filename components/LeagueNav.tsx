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
  { label: 'Make a pick', suffix: '/pick' },
  { label: 'Fixtures', suffix: '/fixtures' },
  { label: 'Results', suffix: '/results' },
  { label: 'Players', suffix: '/players' },
  { label: 'League table', suffix: '/table' },
]

export default function LeagueNav({ leagueId, name, gameweek, status }: LeagueNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/league/${leagueId}`

  const isActive = (suffix: string) => {
    const target = `${base}${suffix}`
    return suffix === '' ? pathname === base : pathname === target || pathname.startsWith(`${target}/`)
  }

  const statusTone =
    status === 'active' || status === 'open'
      ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100'
      : status === 'finished'
        ? 'border-amber-300/30 bg-amber-300/15 text-amber-100'
        : 'border-white/15 bg-white/10 text-slate-200'

  return (
    <header className="league-header text-white">
      <div className="h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-rose-500" />
      <div className="league-header__main">
        <div className="league-header__inner">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="league-brand-mark" aria-hidden="true">
              <span>L</span><span>M</span><span>S</span>
            </div>
            <div className="min-w-0">
              <p className="league-kicker">Last Man Standing <span>•</span> League centre</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
                  {name || 'Loading league...'}
                </h1>
                {status && (
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone}`}>
                    {status}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {typeof gameweek === 'number' && (
              <div className="hidden rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2 text-right sm:block">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sky-200">Current round</p>
                <p className="mt-0.5 text-sm font-extrabold tabular-nums">Gameweek {gameweek}</p>
              </div>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={() => router.push('/competitions')}
              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white transition hover:border-white/40 hover:bg-white/10 sm:text-sm"
            >
              My leagues
            </button>
          </div>
        </div>
      </div>

      <div className="league-tabs-wrap">
        <nav aria-label="League sections" className="league-tabs">
          {tabs.map((tab, index) => {
            const active = isActive(tab.suffix)
            return (
              <Link
                key={tab.suffix}
                href={`${base}${tab.suffix}`}
                aria-current={active ? 'page' : undefined}
                className={`league-tab ${active ? 'league-tab--active' : ''}`}
              >
                <span className="league-tab__number">0{index + 1}</span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
