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

  const [comp, setComp] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [picks, setPicks] = useState<any[]>([])
  const [crestMap, setCrestMap] = useState<Record<number, string>>({})
  const [currentGwFixtures, setCurrentGwFixtures] = useState<any[]>([])
  const [winnerId, setWinnerId] = useState<string | null>(null)
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
        .select('home_team_id, home_team_crest, away_team_id, away_team_crest')

      const map: Record<number, string> = {}
      ;(fixtures || []).forEach((f: any) => {
        if (f.home_team_id && f.home_team_crest) map[f.home_team_id] = f.home_team_crest
        if (f.away_team_id && f.away_team_crest) map[f.away_team_id] = f.away_team_crest
      })
      setCrestMap(map)

      const { data: competition } = await supabase
        .from('competitions')
        .select('current_gameweek, winner_player_id')
        .eq('id', leagueId)
        .single()
      setComp(competition)
      setWinnerId(competition?.winner_player_id || null)
      setPopularityGw(competition?.current_gameweek || 1)

      const { data: gwFixtures } = await supabase
        .from('fixtures_cache')
        .select('home_team_id, away_team_id, status, home_score, away_score')
        .eq('matchday', competition?.current_gameweek)
      setCurrentGwFixtures(gwFixtures || [])

      const { data: playersData, error: pErr } = await supabase
        .from('competition_players')
        .select('*')
        .eq('competition_id', leagueId)
        .order('joined_at', { ascending: true })
      if (pErr) throw pErr
      setPlayers(playersData || [])

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

  const getPlayerPicks = (playerId: string) =>
    picks.filter((p) => p.player_id === playerId)

  // Derived, unofficial status based on the raw fixture result — shows "Out" the moment
  // a picked team's match finishes with a loss or draw, ahead of Process Results being run.
  // Only overrides the badge while the official status is still 'alive'; never touches the DB.
  const getLiveStatus = (player: any): { label: string } | null => {
    if (player.status !== 'alive') return null

    const currentPick = picks.find(
      (p) => p.player_id === player.id && p.gameweek === comp?.current_gameweek
    )
    if (!currentPick) return null

    const fixture = currentGwFixtures.find(
      (f) => f.home_team_id === currentPick.team_id || f.away_team_id === currentPick.team_id
    )
    if (!fixture) return null

    const statusUpper = (fixture.status || '').toUpperCase()
    if (!['FINISHED', 'FT', 'AWARDED'].includes(statusUpper)) return null
    if (fixture.home_score === null || fixture.away_score === null) return null

    const isHome = fixture.home_team_id === currentPick.team_id
    const teamScore = isHome ? fixture.home_score : fixture.away_score
    const oppScore = isHome ? fixture.away_score : fixture.home_score

    if (teamScore <= oppScore) {
      return { label: teamScore === oppScore ? 'Out · drew' : 'Out · lost' }
    }
    return null
  }

  const shortName = (name: string) =>
    (name || '')
      .replace(' FC', '')
      .replace(' AFC', '')
      .replace(' and Hove Albion', '')
      .trim()

  // Pick popularity for the selected gameweek, derived from the picks we already loaded
  const popularity = useMemo(() => {
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
  }, [picks, popularityGw])

  const maxPopularity = popularity[0]?.count || 1

  if (loading) return <p className="text-slate-500 text-center">Loading players...</p>
  if (error) return <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <h2 className="font-semibold text-slate-800 text-sm shrink-0">Pick popularity</h2>
          <select
            className="ml-auto border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
            value={popularityGw ?? ''}
            onChange={(e) => setPopularityGw(Number(e.target.value))}
          >
            {Array.from({ length: comp?.current_gameweek || 1 }, (_, i) => i + 1).map((gw) => (
              <option key={gw} value={gw}>
                GW{gw}{gw === comp?.current_gameweek ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {popularity.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500">No picks made yet for this gameweek.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {popularity.map((c) => (
              <div key={c.team_id} className="px-4 py-2.5">
                <div className="flex items-center gap-3 mb-1">
                  <TeamCrest src={crestMap[c.team_id]} className="w-5 h-5 object-contain shrink-0" />
                  <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                    {shortName(c.team_name)}
                  </span>
                  <span className="text-sm font-bold text-slate-900 shrink-0">{c.count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.max(4, (c.count / maxPopularity) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {players.length === 0 && (
          <p className="p-5 text-slate-500 text-sm">No players in this league yet.</p>
        )}

        {players.map((player) => {
          const playerPicks = getPlayerPicks(player.id)
          const isAlive = player.status === 'alive'
          const isWinner = winnerId === player.id
          const live = getLiveStatus(player)

          return (
            <div key={player.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                  {player.display_name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h2 className="font-semibold text-slate-900 truncate">
                      {player.display_name}
                    </h2>
                    {isWinner && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                        Winner
                      </span>
                    )}
                    {isAlive && !isWinner && live && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700"
                        title="Result in — not yet confirmed via Process Results"
                      >
                        {live.label}
                      </span>
                    )}
                    {isAlive && !isWinner && !live && (
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
                          className="flex flex-col items-center min-w-[52px]"
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
      </div>
    </div>
  )
}
