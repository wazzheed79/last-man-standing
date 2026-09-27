'use client'

import { Fragment, useEffect, useState, type FocusEvent, type MouseEvent } from 'react'
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
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)
  const [formPreview, setFormPreview] = useState<{ teamName: string; form: FormResult[]; x: number; y: number } | null>(null)
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

  const showFormPreview = (event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>, teamName: string, form: FormResult[]) => {
    if (!form.length) {
      setFormPreview(null)
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const width = Math.min(320, window.innerWidth - 24)
    setFormPreview({
      teamName,
      form,
      x: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(bounds.bottom + 8, window.innerHeight - 190)),
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

        {formPreview && (
          <div id="league-form-preview" className="league-form-preview" role="tooltip" style={{ left: formPreview.x, top: formPreview.y }}>
            <div className="league-form-preview__heading">
              <strong>{formPreview.teamName}</strong>
              <span>Last {formPreview.form.length} results</span>
            </div>
            <ol>
              {formPreview.form.map((item, index) => (
                <li key={`${formPreview.teamName}-${index}`}>
                  <span className={`league-form-dot league-form-dot--${item.result.toLowerCase()}`}>{item.result}</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="w-full">
          <table className="league-table w-full table-fixed border-collapse text-sm" aria-label="Premier League standings">
            <thead>
              <tr>
                <th className="league-table__rank">Pos</th>
                <th className="league-table__club">Club</th>
                <th className="league-table__played">P</th>
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
                const expanded = expandedTeamId === teamId
                const detailsId = `team-details-${teamId}`

                return (
                  <Fragment key={teamId}>
                    <tr className={`league-table__summary-row ${index === 0 ? 'league-table__row--leader' : ''} ${position <= 4 ? 'league-table__row--top-four' : ''}`}>
                      <td className="league-table__rank-cell"><span className={index === 0 ? 'league-table__rank-badge league-table__rank-badge--leader' : 'league-table__rank-badge'}>{String(position).padStart(2, '0')}</span></td>
                      <td className="league-table__club-cell">
                        <button
                          type="button"
                          className="league-table__club-toggle"
                          aria-label={`Show ${teamName} standings and recent results`}
                          aria-expanded={expanded}
                          aria-controls={detailsId}
                          aria-describedby={formPreview?.teamName === teamName ? 'league-form-preview' : undefined}
                          onMouseEnter={(event) => showFormPreview(event, teamName, form)}
                          onMouseLeave={() => setFormPreview(null)}
                          onFocus={(event) => showFormPreview(event, teamName, form)}
                          onBlur={() => setFormPreview(null)}
                          onClick={() => setExpandedTeamId(expanded ? null : teamId)}
                        >
                          {crest ? <img src={crest} alt="" className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9" /> : <span className="league-table__crest-fallback">{clean(teamName).slice(0, 2).toUpperCase()}</span>}
                          <span className="min-w-0 flex-1 truncate font-bold" title={teamName}>{team.shortName || clean(teamName)}</span>
                          <span className={`league-table__chevron ${expanded ? 'league-table__chevron--open' : ''}`} aria-hidden="true">⌄</span>
                        </button>
                      </td>
                      <td className="league-table__played-cell">{stat(row, 'playedGames', 'played')}</td>
                      <td className="league-table__points-cell"><span>{points}</span></td>
                    </tr>
                    <tr id={detailsId} hidden={!expanded} className="league-table__details-row">
                      <td colSpan={4}>
                        <div className="league-table__details" aria-label={`${teamName} statistics and recent form`}>
                          <div className="league-table__detail-group">
                            <span className="league-table__detail-label">Record</span>
                            <div className="league-table__detail-stats">
                              <span><b>{stat(row, 'won', 'wins')}</b> Wins</span>
                              <span><b>{stat(row, 'draw', 'draws')}</b> Draws</span>
                              <span><b>{stat(row, 'lost', 'losses')}</b> Losses</span>
                            </div>
                          </div>
                          <div className="league-table__detail-group">
                            <span className="league-table__detail-label">Goals</span>
                            <div className="league-table__detail-stats">
                              <span><b>{stat(row, 'goalsFor', 'gf')}</b> For</span>
                              <span><b>{stat(row, 'goalsAgainst', 'ga')}</b> Against</span>
                              <span><b className={goalDifference > 0 ? 'league-table__positive' : goalDifference < 0 ? 'league-table__negative' : ''}>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</b> Difference</span>
                            </div>
                          </div>
                          <div className="league-table__detail-group league-table__detail-group--form">
                            <span className="league-table__detail-label">Last five</span>
                            <div className="league-table__expanded-form">
                              {form.length ? form.map((item, i) => (
                                <span key={`${teamId}-${i}`} title={item.label} aria-label={item.label} className={`league-form-dot league-form-dot--${item.result.toLowerCase()}`}>{item.result}</span>
                              )) : <span className="league-table__no-form">No recent results</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
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
          <span>Tap a club to see its record and recent form</span>
        </div>
      </section>
    </div>
  )
}
