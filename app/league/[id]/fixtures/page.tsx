'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import TeamCrest from '@/components/TeamCrest'
import { shortTeamName } from '@/lib/teamNames'

export default function LeagueFixturesPage() {
  const params = useParams()
  const leagueId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [gameweek, setGameweek] = useState(1)
  const [thisWeek, setThisWeek] = useState<any[]>([])
  const [nextWeek, setNextWeek] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void load()
    const refresh = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const interval = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [leagueId])

  const load = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: comp } = await supabase
        .from('competitions')
        .select('current_gameweek')
        .eq('id', leagueId)
        .single()

      const gw = comp?.current_gameweek || 1
      setGameweek(gw)

      const { data: a } = await supabase
        .from('fixtures_cache')
        .select('*')
        .eq('matchday', gw)
        .order('utc_date')
      setThisWeek(a || [])

      const { data: b } = await supabase
        .from('fixtures_cache')
        .select('*')
        .eq('matchday', gw + 1)
        .order('utc_date')
      setNextWeek(b || [])
    } finally {
      setLoading(false)
    }
  }

  const formatKickoff = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const row = (f: any) => {
    const home = shortTeamName(f.home_team_name)
    const away = shortTeamName(f.away_team_name)
    const score =
      f.status === 'FINISHED' || f.home_score != null
        ? `${f.home_score ?? 0}-${f.away_score ?? 0}`
        : 'vs'

    return (
      <article key={f.match_id} className="league-fixture-row">
        <p className="league-fixture-row__kickoff">{formatKickoff(f.utc_date)}</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 min-w-0 justify-start">
            <TeamCrest
              src={f.home_team_crest}
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
            />
            <span
              className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight"
              title={f.home_team_name}
            >
              {home}
            </span>
          </div>

          <div className={`league-fixture-score ${f.status === 'IN_PLAY' || f.status === 'LIVE' || f.status === 'PAUSED' ? 'league-fixture-score--live' : ''}`}>
            {score}
          </div>

          <div className="flex items-center gap-1.5 min-w-0 justify-end">
            <span
              className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight text-right"
              title={f.away_team_name}
            >
              {away}
            </span>
            <TeamCrest
              src={f.away_team_crest}
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
            />
          </div>
        </div>

        <p className={`league-fixture-status ${f.status === 'IN_PLAY' || f.status === 'LIVE' || f.status === 'PAUSED' ? 'league-fixture-status--live' : ''}`}>
          {f.status === 'TIMED' || f.status === 'SCHEDULED'
            ? 'Kick-off scheduled'
            : f.status === 'IN_PLAY' || f.status === 'LIVE' || f.status === 'PAUSED'
            ? 'Live now'
            : f.status === 'FINISHED' || f.status === 'FT'
            ? 'Full time'
            : 'Fixture'}
        </p>
      </article>
    )
  }

  if (loading) return <p className="text-slate-500 text-center">Loading fixtures...</p>

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="league-page-intro">
        <div>
          <p className="league-eyebrow"><span className="league-eyebrow__dot" /> Match centre</p>
          <h2 className="league-page-title">Fixtures</h2>
          <p className="league-page-subtitle">Kick-off times, match status and the next round at a glance.</p>
        </div>
        <div className="league-intro-tag"><span className="league-intro-tag__icon">GW</span> Gameweek {gameweek}</div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="league-stat-card"><span className="league-stat-card__label">This gameweek</span><span className="league-stat-card__value">{thisWeek.length}</span><span className="league-stat-card__detail">fixtures · GW {gameweek}</span></div>
        <div className="league-stat-card league-stat-card--leader"><span className="league-stat-card__label">Coming up next</span><span className="league-stat-card__value">{nextWeek.length}</span><span className="league-stat-card__detail">fixtures · GW {gameweek + 1}</span></div>
      </div>

      <section className="league-fixture-section">
        <div className="league-matchday-heading">
          <div><p className="league-matchday-heading__eyebrow">Current round</p><h3>This week <span>· GW {gameweek}</span></h3></div>
          <span className="league-matchday-heading__count">{thisWeek.length} fixtures</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {thisWeek.length ? (
            thisWeek.map(row)
          ) : (
            <p className="p-4 text-sm text-slate-500">No fixtures loaded.</p>
          )}
        </div>
      </section>

      <section className="league-fixture-section">
        <div className="league-matchday-heading">
          <div><p className="league-matchday-heading__eyebrow">Upcoming round</p><h3>Next week <span>· GW {gameweek + 1}</span></h3></div>
          <span className="league-matchday-heading__count">{nextWeek.length} fixtures</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {nextWeek.length ? (
            nextWeek.map(row)
          ) : (
            <p className="p-4 text-sm text-slate-500">
              No fixtures for next week yet. Run fetch-fixtures for matchday{' '}
              {gameweek + 1}.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
