'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { shortTeamName } from '@/lib/teamNames'

export default function LeagueResultsPage() {
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    void load()
    const refresh = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const interval = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const load = async () => {
    const { data } = await supabase
      .from('fixtures_cache')
      .select('*')
      .in('status', ['FINISHED', 'FT', 'AWARDED'])
      .order('matchday', { ascending: false })
      .order('utc_date', { ascending: true })
    setFixtures(data || [])
    setLoading(false)
  }

  const formatKickoff = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const grouped: Record<number, any[]> = {}
  fixtures.forEach((fixture) => {
    if (!grouped[fixture.matchday]) grouped[fixture.matchday] = []
    grouped[fixture.matchday].push(fixture)
  })
  const matchdays = Object.keys(grouped).map(Number).sort((a, b) => b - a)
  const goals = fixtures.reduce((sum, fixture) => sum + Number(fixture.home_score || 0) + Number(fixture.away_score || 0), 0)
  const latestMatchday = matchdays[0]

  if (loading) {
    return (
      <div className="space-y-4" aria-live="polite">
        <div className="league-page-intro animate-pulse"><div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" /><div className="mt-4 h-8 w-56 rounded bg-slate-200 dark:bg-slate-700" /></div>
        <div className="h-64 rounded-2xl bg-white shadow-sm dark:bg-slate-900" />
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="league-page-intro">
        <div>
          <p className="league-eyebrow"><span className="league-eyebrow__dot league-eyebrow__dot--red" /> Full time</p>
          <h2 className="league-page-title">Results</h2>
          <p className="league-page-subtitle">Every final score, grouped by matchday, with the winning side easy to spot.</p>
        </div>
        <div className="league-intro-tag"><span className="league-intro-tag__icon league-intro-tag__icon--red">FT</span> Match centre</div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Results summary">
        <div className="league-stat-card"><span className="league-stat-card__label">Matches completed</span><span className="league-stat-card__value">{fixtures.length}</span><span className="league-stat-card__detail">full-time scores</span></div>
        <div className="league-stat-card"><span className="league-stat-card__label">Goals scored</span><span className="league-stat-card__value">{goals}</span><span className="league-stat-card__detail">across completed fixtures</span></div>
        <div className="league-stat-card league-stat-card--leader"><span className="league-stat-card__label">Latest matchday</span><span className="league-stat-card__value">{latestMatchday ? `GW ${latestMatchday}` : '—'}</span><span className="league-stat-card__detail">{latestMatchday ? `${grouped[latestMatchday].length} matches shown` : 'No matchdays yet'}</span></div>
      </section>

      {matchdays.length === 0 ? (
        <div className="league-empty-state">
          <span className="league-empty-state__eyebrow">Match centre</span>
          <h2>No finished matches yet</h2>
          <p>Completed results will appear here when they are available.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {matchdays.map((matchday) => (
            <section key={matchday} className="league-matchday-card">
              <div className="league-matchday-heading">
                <div>
                  <p className="league-matchday-heading__eyebrow">Matchday {matchday}</p>
                  <h3>Final scores</h3>
                </div>
                <span className="league-matchday-heading__count">{grouped[matchday].length} matches</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {grouped[matchday].map((fixture) => {
                  const homeScore = Number(fixture.home_score || 0)
                  const awayScore = Number(fixture.away_score || 0)
                  const homeWon = homeScore > awayScore
                  const awayWon = awayScore > homeScore
                  return (
                    <article key={fixture.match_id} className="league-result-row">
                      <p className="league-result-row__date">{formatKickoff(fixture.utc_date)}</p>
                      <div className="league-result-row__teams">
                        <div className={`league-result-team ${homeWon ? 'league-result-team--winner' : ''}`}>
                          <span className="league-result-team__identity">
                            {fixture.home_team_crest && <img src={fixture.home_team_crest} alt="" className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10" />}
                            <span title={fixture.home_team_name}>{shortTeamName(fixture.home_team_name)}</span>
                          </span>
                        </div>
                        <div className="league-result-scoreboard" aria-label={`Full time: ${homeScore} to ${awayScore}`}>
                          <span>{homeScore}</span><b>–</b><span>{awayScore}</span><em>FT</em>
                        </div>
                        <div className={`league-result-team league-result-team--away ${awayWon ? 'league-result-team--winner' : ''}`}>
                          <span className="league-result-team__identity league-result-team__identity--away">
                            <span title={fixture.away_team_name}>{shortTeamName(fixture.away_team_name)}</span>
                            {fixture.away_team_crest && <img src={fixture.away_team_crest} alt="" className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10" />}
                          </span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
