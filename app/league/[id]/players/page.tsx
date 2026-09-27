'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import TeamCrest from '@/components/TeamCrest'

export default function LeaguePlayersPage() {
  const params = useParams()
  const leagueId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [players, setPlayers] = useState<any[]>([])
  const [picks, setPicks] = useState<any[]>([])
  const [crestMap, setCrestMap] = useState<Record<number, string>>({})
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [picksHidden, setPicksHidden] = useState(false)
  const [currentGameweek, setCurrentGameweek] = useState<number>(1)
  const [popularityGw, setPopularityGw] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [leagueId])

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: fixtures } = await supabase
        .from('fixtures_cache')
        .select('home_team_id, home_team_crest, away_team_id, away_team_crest, matchday, utc_date')

      const map: Record<number, string> = {}
      ;(fixtures || []).forEach((f: any) => {
        if (f.home_team_id && f.home_team_crest) map[f.home_team_id] = f.home_team_crest
        if (f.away_team_id && f.away_team_crest) map[f.away_team_id] = f.away_team_crest
      })
      setCrestMap(map)

      const { data: comp } = await supabase
        .from('competitions')
        .select('winner_player_id, current_gameweek, hide_picks_until_ko')
        .eq('id', leagueId)
        .single()
      setWinnerId(comp?.winner_player_id || null)
      setCurrentGameweek(comp?.current_gameweek || 1)
      setPopularityGw(comp?.current_gameweek || 1)

      let hidden = false
      if (comp?.hide_picks_until_ko) {
        const gw = comp.current_gameweek
        const gwFixtures = (fixtures || []).filter((f: any) => f.matchday === gw)
        if (gwFixtures.length) {
          const first = gwFixtures.reduce(
            (min: string, f: any) => (f.utc_date < min ? f.utc_date : min),
            gwFixtures[0].utc_date
          )
          hidden = new Date() < new Date(first)
        } else {
          hidden = true
        }
      }
      setPicksHidden(hidden)

      const { data: playersData, error: pErr } = await supabase
        .from('competition_players')
        .select('*')
        .eq('competition_id', leagueId)
        .order('joined_at', { ascending: true })
      if (pErr) throw pErr
      setPlayers(playersData || [])

      const mine = (playersData || []).find((p: any) => p.user_id === user.id)
      setMyPlayerId(mine?.id || null)

      const { data: picksData, error: picksErr } = await supabase
        .from('picks')
        .select('*')
        .eq('competition_id', leagueId)
        .order('gameweek', { ascending: true })
      if (picksErr) throw picksErr
      setPicks(picksData || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getPlayerPicks = (playerId: string) => {
    const list = picks.filter((p) => p.player_id === playerId)
    if (!picksHidden) return list
    // Hide other players' picks until first KO; always show your own
    if (playerId === myPlayerId) return list
    return []
  }

  const shortName = (name: string) =>
    (name || '')
      .replace(' FC', '')
      .replace(' AFC', '')
      .replace(' and Hove Albion', '')
      .trim()

  // Pick popularity for the selected gameweek. Only hidden when the selected
  // gameweek is the current one and hide-until-kickoff is in effect — past
  // gameweeks have already kicked off, so there's nothing left to protect there.
  const popularityBlockedByPrivacy = picksHidden && popularityGw === currentGameweek

  const popularity = useMemo(() => {
    if (popularityBlockedByPrivacy || popularityGw === null) return []
    const map = new Map<number, { team_id: number; team_name: string; count: number }>()
    picks
      .filter((p) => p.gameweek === popularityGw)
      .forEach((p) => {
        const existing = map.get(p.team_id)
        if (existing) {
          existing.count += 1
        } else {
          map.set(p.team_id, { team_id: p.team_id, team_name: p.team_name, count: 1 })
        }
      })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [picks, popularityGw, popularityBlockedByPrivacy])

  const maxPopularity = popularity[0]?.count || 1

  if (loading) return <p className="text-slate-500 dark:text-slate-400 text-center">Loading players...</p>
  if (error) return <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>

  const aliveCount = players.filter((player) => player.status === 'alive').length

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="league-page-intro">
        <div>
          <p className="league-eyebrow"><span className="league-eyebrow__dot" /> League line-up</p>
          <h2 className="league-page-title">Players &amp; picks</h2>
          <p className="league-page-subtitle">See who is still in, follow each player&apos;s route, and compare team choices.</p>
        </div>
        <div className="league-intro-tag"><span className="league-intro-tag__icon">{aliveCount}</span> Still alive</div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Player summary">
        <div className="league-stat-card"><span className="league-stat-card__label">Players</span><span className="league-stat-card__value">{players.length}</span><span className="league-stat-card__detail">in this league</span></div>
        <div className="league-stat-card league-stat-card--leader"><span className="league-stat-card__label">Still alive</span><span className="league-stat-card__value">{aliveCount}</span><span className="league-stat-card__detail">can pick this week</span></div>
        <div className="league-stat-card"><span className="league-stat-card__label">Picks recorded</span><span className="league-stat-card__value">{picks.length}</span><span className="league-stat-card__detail">across all gameweeks</span></div>
      </section>

      {picksHidden && (
        <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          Other players&apos; picks are hidden until the first kick-off of this gameweek. You can still see your own.
        </p>
      )}

      <section className="league-table-card overflow-hidden">
        <div className="league-card-heading flex-wrap">
          <div><p className="league-card-heading__eyebrow">Team trends</p><h3>Pick popularity</h3></div>
          <select
            aria-label="Choose gameweek for pick popularity"
            className="ml-auto border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm font-semibold"
            value={popularityGw ?? ''}
            onChange={(e) => setPopularityGw(Number(e.target.value))}
          >
            {Array.from({ length: currentGameweek || 1 }, (_, i) => i + 1).map((gw) => (
              <option key={gw} value={gw}>
                GW{gw}{gw === currentGameweek ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {popularityBlockedByPrivacy ? (
          <p className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
            Hidden until the first kick-off of this gameweek.
          </p>
        ) : popularity.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">No picks made yet for this gameweek.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {popularity.map((c) => (
              <div key={c.team_id} className="px-4 py-2.5">
                <div className="flex items-center gap-3 mb-1">
                  <TeamCrest src={crestMap[c.team_id]} className="w-5 h-5 object-contain shrink-0" />
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {shortName(c.team_name)}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white shrink-0">{c.count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-blue-600 rounded-full"
                    style={{ width: `${Math.max(4, (c.count / maxPopularity) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="league-table-card overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
      <div className="league-card-heading">
        <div><p className="league-card-heading__eyebrow">The competition</p><h3>Player picks</h3></div>
        <span className="league-card-heading__count">{players.length} players</span>
      </div>
      {players.length === 0 && (
        <p className="p-5 text-slate-500 text-sm">No players in this league yet.</p>
      )}

      {players.map((player) => {
        const playerPicks = getPlayerPicks(player.id)
        const isAlive = player.status === 'alive'
        const isWinner = winnerId === player.id

        return (
          <div key={player.id} className="p-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60 sm:p-5">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${isAlive ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                {player.display_name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="font-extrabold text-slate-900 dark:text-white truncate">
                    {player.display_name}
                  </h2>
                  {isWinner && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                      Winner
                    </span>
                  )}
                  {isAlive && !isWinner && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Alive
                    </span>
                  )}
                  {!isAlive && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-white">
                      Eliminated{player.eliminated_gameweek ? ` · GW${player.eliminated_gameweek}` : ''}
                    </span>
                  )}
                </div>

                {playerPicks.length === 0 ? (
                  <p className="text-sm text-slate-400">No picks yet</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {playerPicks.map((pick) => (
                      <div
                        key={pick.id}
                      className="flex min-w-[64px] flex-col items-center rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/70"
                        title={`GW${pick.gameweek}: ${pick.team_name}`}
                      >
                        <TeamCrest
                          src={crestMap[pick.team_id]}
                          className="w-7 h-7 object-contain mb-1 rounded"
                        />
                        <div className="text-[10px] font-semibold text-slate-700 text-center leading-tight">
                          {shortName(pick.team_name)}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">GW{pick.gameweek}</div>
                        {pick.status === 'postponed' ? (
                          <span className="text-[9px] font-semibold text-amber-600 mt-1">POST</span>
                        ) : (
                          <div
                            className={`w-2.5 h-2.5 rounded-full mt-1 ${
                              pick.result === 'win'
                                ? 'bg-emerald-500'
                                : pick.result === 'loss'
                                ? 'bg-red-500'
                                : pick.result === 'draw'
                                ? 'bg-slate-400'
                                : 'bg-slate-300'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
      </section>
    </div>
  )
}
