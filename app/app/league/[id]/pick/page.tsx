'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function LeaguePickPage() {
  const params = useParams()
  const leagueId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [player, setPlayer] = useState<any>(null)
  const [comp, setComp] = useState<any>(null)
  const [fixtures, setFixtures] = useState<any[]>([])
  const [usedTeams, setUsedTeams] = useState<number[]>([])
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    load(true)
    const interval = setInterval(() => load(false), 30000)
    return () => clearInterval(interval)
  }, [leagueId])

  const load = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: competition, error: cErr } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', leagueId)
        .single()
      if (cErr) throw cErr
      setComp(competition)

      const { data: me, error: meErr } = await supabase
        .from('competition_players')
        .select('*')
        .eq('competition_id', leagueId)
        .eq('user_id', user.id)
        .single()
      if (meErr) throw meErr
      setPlayer(me)

      if (me.status !== 'alive') {
        setLoading(false)
        return
      }

      const gw = competition.current_gameweek

      const { data: fixturesData } = await supabase
        .from('fixtures_cache')
        .select('*')
        .eq('matchday', gw)
        .order('utc_date')
      setFixtures(fixturesData || [])
      setLastUpdated(new Date())

      const { data: picksData } = await supabase
        .from('picks')
        .select('*')
        .eq('player_id', me.id)

      setUsedTeams((picksData || []).map((p: any) => p.team_id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePick = async () => {
    if (!selectedTeam || !player || !comp) return
    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.from('picks').insert({
        competition_id: leagueId,
        player_id: player.id,
        gameweek: comp.current_gameweek,
        team_id: selectedTeam.id,
        team_name: selectedTeam.name,
      })
      if (error) throw error

      setMessage(`Picked ${selectedTeam.name} for GW${comp.current_gameweek}`)
      setSelectedTeam(null)
      setUsedTeams((prev) => [...prev, selectedTeam.id])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isLive = (status: string) => {
    const s = (status || '').toUpperCase()
    return ['IN_PLAY', 'LIVE', 'PAUSED', 'HALFTIME', 'HT'].includes(s)
  }

  const isFinished = (status: string) => {
    const s = (status || '').toUpperCase()
    return ['FINISHED', 'FT', 'AWARDED'].includes(s)
  }

  const scoreLabel = (f: any) => {
    if (isLive(f.status) || isFinished(f.status) || f.home_score != null) {
      return `${f.home_score ?? 0}–${f.away_score ?? 0}`
    }
    return 'vs'
  }

  if (loading) return <p className="text-slate-500 text-center">Loading...</p>

  if (player && player.status !== 'alive') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
        <p className="text-slate-700 font-medium">You are eliminated</p>
        <p className="text-sm text-slate-500 mt-1">
          {player.eliminated_gameweek
            ? `You went out in Gameweek ${player.eliminated_gameweek}.`
            : 'You can still view players and results.'}
        </p>
      </div>
    )
  }

  if (comp && ['finished', 'archived'].includes(comp.status)) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
        <p className="text-slate-700 font-medium">This league is finished</p>
        <p className="text-sm text-slate-500 mt-1">Picking is closed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <p className="text-xs text-slate-500">
          {lastUpdated
            ? `Scores refresh every 30s · Updated ${lastUpdated.toLocaleTimeString()}`
            : 'Loading scores...'}
        </p>
        <button
          type="button"
          onClick={() => load(false)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh now
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">
            Gameweek {comp?.current_gameweek} — click a team
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {fixtures.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">No fixtures for this gameweek.</p>
          ) : (
            fixtures.map((f) => {
              const homeUsed = usedTeams.includes(f.home_team_id)
              const awayUsed = usedTeams.includes(f.away_team_id)
              const homeSelected = selectedTeam?.id === f.home_team_id
              const awaySelected = selectedTeam?.id === f.away_team_id
              const live = isLive(f.status)
              const finished = isFinished(f.status)

              return (
                <div key={f.match_id} className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={homeUsed}
                      onClick={() =>
                        !homeUsed &&
                        setSelectedTeam({
                          id: f.home_team_id,
                          name: f.home_team_name,
                          crest: f.home_team_crest,
                        })
                      }
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition ${
                        homeSelected
                          ? 'bg-blue-600 text-white'
                          : homeUsed
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {f.home_team_crest && (
                        <img src={f.home_team_crest} alt="" className="w-6 h-6 object-contain" />
                      )}
                      <span className="truncate">
                        {f.home_team_name?.replace(' FC', '').replace(' AFC', '')}
                      </span>
                    </button>

                    <div className="flex flex-col items-center min-w-[64px]">
                      <span
                        className={`text-sm font-bold ${
                          live ? 'text-red-600' : finished ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {scoreLabel(f)}
                      </span>
                      {live && (
                        <span className="text-[10px] font-bold text-red-600 animate-pulse">
                          LIVE
                        </span>
                      )}
                      {finished && (
                        <span className="text-[10px] font-medium text-slate-400">FT</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={awayUsed}
                      onClick={() =>
                        !awayUsed &&
                        setSelectedTeam({
                          id: f.away_team_id,
                          name: f.away_team_name,
                          crest: f.away_team_crest,
                        })
                      }
                      className={`flex-1 flex items-center justify-end gap-2 px-3 py-2.5 rounded-lg text-right text-sm font-medium transition ${
                        awaySelected
                          ? 'bg-blue-600 text-white'
                          : awayUsed
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="truncate">
                        {f.away_team_name?.replace(' FC', '').replace(' AFC', '')}
                      </span>
                      {f.away_team_crest && (
                        <img src={f.away_team_crest} alt="" className="w-6 h-6 object-contain" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        {selectedTeam ? (
          <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
            {selectedTeam.crest && (
              <img src={selectedTeam.crest} alt="" className="w-8 h-8 object-contain" />
            )}
            <div>
              <p className="text-xs text-blue-600 font-medium">Selected</p>
              <p className="font-semibold text-slate-900">{selectedTeam.name}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 mb-4">Select a team above.</p>
        )}

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {message && <p className="text-emerald-600 text-sm mb-3">{message}</p>}

        <button
          type="button"
          onClick={handlePick}
          disabled={!selectedTeam || submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-medium"
        >
          {submitting ? 'Saving...' : 'Confirm Pick'}
        </button>
      </div>
    </div>
  )
}