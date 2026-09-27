'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type FormResult = { result: 'W' | 'D' | 'L'; label: string }

const stat = (row: any, ...keys: string[]) => {
  const value = keys.map((key) => row?.[key]).find((item) => item !== undefined && item !== null)
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function LeagueTablePage() {
  const [standings, setStandings] = useState<any[]>([])
  const [finishedFixtures, setFinishedFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-standings`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStandings(data.standings || data.table || [])

      const { data: fixtures } = await supabase
        .from('fixtures_cache')
        .select('*')
        .in('status', ['FINISHED', 'FT', 'AWARDED'])
        .order('utc_date', { ascending: false })
      setFinishedFixtures(fixtures || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clean = (name: string) =>
    (name || '')
      .replace(' FC', '')
      .replace(' AFC', '')
      .replace(' and Hove Albion', '')
      .trim()

  const namesMatch = (a: string, b: string) => {
    const x = clean(a).toLowerCase()
    const y = clean(b).toLowerCase()
    return x === y || x.includes(y) || y.includes(x)
  }

  const getTeamForm = (teamId: number, teamName: string): FormResult[] => {
    const matches = finishedFixtures
      .filter((fixture) => {
        if (fixture.home_team_id === teamId || fixture.away_team_id === teamId) return true
        return namesMatch(fixture.home_team_name, teamName) || namesMatch(fixture.away_team_name, teamName)
      })
      .sort((a, b) => new Date(b.utc_date).getTime() - new Date(a.utc_date).getTime())
      .slice(0, 5)
      .reverse()

    return matches.map((match) => {
      const isHome = match.home_team_id === teamId || namesMatch(match.home_team_name, teamName)
      const teamScore = Number(isHome ? match.home_score : match.away_score)
      const opponentScore = Number(isHome ? match.away_score : match.home_score)
      const opponent = isHome ? match.away_team_name : match.home_team_name
      const result: FormResult['result'] = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D'
      return { result, label: `${result} ${teamScore}-${opponentScore} vs ${clean(opponent)}` }
    })
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-live="polite">
        <div className="league-page-intro animate-pulse">
          <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 h-8 w-64 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-64 rounded-2xl bg-white shadow-sm dark:bg-slate-900" />
      </div>
    )
  }

  if (error) {
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">{error}</div>
  }

  if (!standings.length) {
    return (
      <div className="league-empty-state">
        <span className="league-empty-state__eyebrow">Standings</span>
        <h2>No standings data yet</h2>
        <p>The league table will appear here when the standings feed is available.</p>
      </div>
    )
  }

  const leader = standings[0]
  const leaderTeam = leader.team || leader
  const leaderName = leaderTeam.shortName || clean(leaderTeam.name || '')
  const totalGoals = standings.reduce((sum, row) => sum + stat(row, 'goalsFor', 'gf'), 0)
  const totalPlayed = standings.reduce((sum, row) => sum + stat(row, 'playedGames', 'played'), 0)
  const matchCount = Math.round(totalPlayed / 2)

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="league-page-intro">
        <div>
          <p className="league-eyebrow"><span className="league-eyebrow__dot" /> Season standings</p>
          <h2 className="league-page-title">League table</h2>
          <p className="league-page-subtitle">The full picture, from points and goal difference to each club&apos;s recent form.</p>
        </div>
        <div className="league-intro-tag"><span className="league-intro-tag__icon">PL</span> Premier League</div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Standings summary">
        <div className="league-stat-card">
          <span className="league-stat-card__label">Clubs</span>
          <span className="league-stat-card__value">{standings.length}</span>
          <span className="league-stat-card__detail">in the table</span>
        </div>
        <div className="league-stat-card">
          <span className="league-stat-card__label">Matches played</span>
          <span className="league-stat-card__value">{matchCount.toLocaleString()}</span>
          <span className="league-stat-card__detail">across all clubs</span>
        </div>
        <div className="league-stat-card league-stat-card--leader">
          <span className="league-stat-card__label">Current leader</span>
          <span className="league-stat-card__value league-stat-card__value--team">{leaderName}</span>
          <span className="league-stat-card__detail">{stat(leader, 'points', 'pts')} points · {totalGoals} goals scored</span>
        </div>
      </section>

      <section className="league-table-card">
        <div className="league-card-heading">
          <div>
            <p className="league-card-heading__eyebrow">Premier League</p>
            <h3>Standings</h3>
          </div>
          <span className="league-card-heading__count">{standings.length} clubs</span>
        </div>

        {tip && (
          <div
            className="fixed z-50 pointer-events-none rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-xl"
            style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, -115%)' }}
          >
            {tip.text}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="league-table w-full min-w-[920px] border-collapse text-sm" aria-label="Premier League standings">
            <thead>
              <tr>
                <th className="league-table__rank">Pos</th>
                <th className="league-table__club">Club</th>
                <th className="league-table__form">Last 5</th>
                <th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th>
                <th className="league-table__points">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row: any, index: number) => {
                const team = row.team || row
                const teamId = Number(team.id ?? team.team_id ?? index)
                const teamName = team.name || team.shortName || ''
                const form = getTeamForm(teamId, teamName)
                const position = stat(row, 'position', 'rank') || index + 1
                const points = stat(row, 'points', 'pts')
                const goalDifference = stat(row, 'goalDifference', 'gd')
                const crest = team.crest || team.team_crest

                return (
                  <tr key={teamId} className={`${index === 0 ? 'league-table__row--leader' : ''} ${position <= 4 ? 'league-table__row--top-four' : ''}`}>
                    <td className="league-table__rank-cell"><span className={index === 0 ? 'league-table__rank-badge league-table__rank-badge--leader' : 'league-table__rank-badge'}>{String(position).padStart(2, '0')}</span></td>
                    <td className="league-table__club-cell">
                      <div className="flex min-w-0 items-center gap-3">
                          {crest ? <img src={crest} alt="" className="h-9 w-9 shrink-0 object-contain" /> : <span className="league-table__crest-fallback">{clean(teamName).slice(0, 2).toUpperCase()}</span>}
                        <span className="min-w-0 truncate font-bold" title={teamName}>{team.shortName || clean(teamName)}</span>
                      </div>
                    </td>
                    <td className="league-table__form-cell">
                      <div className="flex items-center gap-1.5">
                        {form.length ? form.map((item, i) => (
                          <button
                            key={`${teamId}-${i}`}
                            type="button"
                            aria-label={`${teamName}: ${item.label}`}
                            onMouseEnter={(event) => {
                              const bounds = event.currentTarget.getBoundingClientRect()
                              setTip({ text: item.label, x: bounds.left + bounds.width / 2, y: bounds.top })
                            }}
                            onMouseLeave={() => setTip(null)}
                            onFocus={(event) => {
                              const bounds = event.currentTarget.getBoundingClientRect()
                              setTip({ text: item.label, x: bounds.left + bounds.width / 2, y: bounds.top })
                            }}
                            onBlur={() => setTip(null)}
                            className={`league-form-dot league-form-dot--${item.result.toLowerCase()}`}
                          >
                            {item.result}
                          </button>
                        )) : <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                    <td>{stat(row, 'playedGames', 'played')}</td>
                    <td>{stat(row, 'won', 'wins')}</td>
                    <td>{stat(row, 'draw', 'draws')}</td>
                    <td>{stat(row, 'lost', 'losses')}</td>
                    <td>{stat(row, 'goalsFor', 'gf')}</td>
                    <td>{stat(row, 'goalsAgainst', 'ga')}</td>
                    <td className={goalDifference > 0 ? 'league-table__positive' : goalDifference < 0 ? 'league-table__negative' : ''}>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</td>
                    <td className="league-table__points-cell"><span>{points}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="league-table-legend">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span><b className="league-key league-key--blue" /> Qualification places</span>
            <span><b className="league-key league-key--green" /> Win</span>
            <span><b className="league-key league-key--draw" /> Draw</span>
            <span><b className="league-key league-key--red" /> Loss</span>
          </div>
          <span className="hidden sm:inline">Hover or focus form to see the score</span>
          <span className="sm:hidden">Swipe sideways to see all stats</span>
        </div>
      </section>
    </div>
  )
}
