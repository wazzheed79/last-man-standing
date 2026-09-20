'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function PlayersPage() {
  const [competitions, setCompetitions] = useState<any[]>([])
  const [selectedCompId, setSelectedCompId] = useState('')
  const [players, setPlayers] = useState<any[]>([])
  const [picks, setPicks] = useState<any[]>([])
  const [crestMap, setCrestMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadCompetitions()
  }, [])

  const loadCrests = async () => {
    const { data } = await supabase
      .from('fixtures_cache')
      .select('home_team_id, home_team_crest, away_team_id, away_team_crest')

    const map: Record<number, string> = {}
    ;(data || []).forEach((f: any) => {
      if (f.home_team_id && f.home_team_crest) map[f.home_team_id] = f.home_team_crest
      if (f.away_team_id && f.away_team_crest) map[f.away_team_id] = f.away_team_crest
    })
    setCrestMap(map)
  }

  const loadCompetitions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      await loadCrests()

      const { data, error } = await supabase
        .from('competition_players')
        .select(`
          competition_id,
          competitions!competition_players_competition_id_fkey (
            id,
            name,
            join_code,
            current_gameweek,
            status
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      // Hide fully archived from the main list? Keep them for history
      const uniqueComps = (data || []).filter((c: any) => c.competitions)
      setCompetitions(uniqueComps)

      if (uniqueComps.length > 0) {
        const firstId = uniqueComps[0].competitions.id
        setSelectedCompId(firstId)
        await loadPlayersAndPicks(firstId)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPlayersAndPicks = async (competitionId: string) => {
    setError('')
    try {
      const { data: playersData, error: playersError } = await supabase
        .from('competition_players')
        .select('*')
        .eq('competition_id', competitionId)
        .order('joined_at', { ascending: true })

      if (playersError) throw playersError
      setPlayers(playersData || [])

      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select('*')
        .eq('competition_id', competitionId)
        .order('gameweek', { ascending: true })

      if (picksError) throw picksError
      setPicks(picksData || [])
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCompChange = async (compId: string) => {
    setSelectedCompId(compId)
    await loadPlayersAndPicks(compId)
  }

  const getPlayerPicks = (playerId: string) =>
    picks.filter((p) => p.player_id === playerId)

  const shortName = (name: string) =>
    (name || '')
      .replace(' FC', '')
      .replace(' AFC', '')
      .replace(' and Hove Albion', '')
      .trim()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Players & Picks</h1>
            <p className="text-xs text-slate-500">Who’s left, who went out, and what they picked</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Home
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {competitions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <p className="text-slate-600">You are not in any competitions yet.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Competition
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                value={selectedCompId}
                onChange={(e) => handleCompChange(e.target.value)}
              >
                {competitions.map((c) => (
                  <option key={c.competitions.id} value={c.competitions.id}>
                    {c.competitions.name} (GW {c.competitions.current_gameweek})
                    {c.competitions.status === 'finished' ? ' · Finished' : ''}
                    {c.competitions.status === 'archived' ? ' · Archived' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {players.map((player) => {
                const playerPicks = getPlayerPicks(player.id)
                const isAlive = player.status === 'alive'

                return (
                  <div key={player.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                        {player.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-2">
                          <h2 className="font-semibold text-slate-900 truncate">
                            {player.display_name}
                          </h2>
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                              isAlive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-800 text-white'
                            }`}
                          >
                            {isAlive
                              ? 'Alive'
                              : `Out GW${player.eliminated_gameweek || '?'}`}
                          </span>
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
                                {crestMap[pick.team_id] ? (
                                  <img
                                    src={crestMap[pick.team_id]}
                                    alt=""
                                    className="w-7 h-7 object-contain mb-1"
                                  />
                                ) : (
                                  <div className="w-7 h-7 mb-1 rounded bg-slate-100" />
                                )}
                                <div className="text-[10px] font-semibold text-slate-700 text-center leading-tight">
                                  {shortName(pick.team_name)}
                                </div>
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  GW{pick.gameweek}
                                </div>
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
          </>
        )}
      </main>
    </div>
  )
}