'use client'

import { useEffect, useState } from 'react'
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

  if (loading) return <p className="text-slate-500 text-center">Loading players...</p>
  if (error) return <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {picksHidden && (
        <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          Other players&apos; picks are hidden until the first kick-off of this gameweek. You can still see your own.
        </p>
      )}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
      {players.length === 0 && (
        <p className="p-5 text-slate-500 text-sm">No players in this league yet.</p>
      )}

      {players.map((player) => {
        const playerPicks = getPlayerPicks(player.id)
        const isAlive = player.status === 'alive'
        const isWinner = winnerId === player.id

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