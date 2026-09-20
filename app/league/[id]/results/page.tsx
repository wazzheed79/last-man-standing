'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LeagueResultsPage() {
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [goalsByMatch, setGoalsByMatch] = useState<Record<number, any[]>>({})
  const [loadingMatch, setLoadingMatch] = useState<number | null>(null)
  const [detailError, setDetailError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data } = await supabase
      .from('fixtures_cache')
      .select('*')
      .in('status', ['FINISHED', 'FT', 'AWARDED'])
      .order('matchday', { ascending: false })
      .order('utc_date', { ascending: true })

    const rows = data || []
    setFixtures(rows)

    const map: Record<number, any[]> = {}
    rows.forEach((f: any) => {
      if (Array.isArray(f.goals) && f.goals.length) {
        map[f.match_id] = f.goals
      }
    })
    setGoalsByMatch(map)
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

  const openMatch = async (f: any) => {
    const id = f.match_id
    if (expandedId === id) {
      setExpandedId(null)
      setDetailError('')
      return
    }

    setExpandedId(id)
    setDetailError('')

    if (goalsByMatch[id]?.length) return
    if (Array.isArray(f.goals) && f.goals.length) {
      setGoalsByMatch((prev) => ({ ...prev, [id]: f.goals }))
      return
    }

    setLoadingMatch(id)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-match-details`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ match_id: id }),
        }
      )
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Could not load scorers')
      }
      setGoalsByMatch((prev) => ({ ...prev, [id]: json.goals || [] }))
    } catch (err: any) {
      setDetailError(err.message || 'Could not load scorers for this match')
    } finally {
      setLoadingMatch(null)
    }
  }

  const goalsForTeam = (goals: any[], teamId: number) =>
    (goals || []).filter((g) => g.team_id === teamId)

  const grouped: Record<number, any[]> = {}
  fixtures.forEach((f) => {
    if (!grouped[f.matchday]) grouped[f.matchday] = []
    grouped[f.matchday].push(f)
  })
  const matchdays = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a)

  if (loading) return <p className="text-slate-500 text-center">Loading results...</p>

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500 px-1">
        Tap a result to see goal scorers and times
      </p>

      {matchdays.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-600 text-sm">
          No finished matches yet.
        </div>
      )}

      {matchdays.map((md) => (
        <div
          key={md}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="bg-slate-800 text-white px-4 py-3 font-semibold text-sm">
            Matchday {md}
          </div>
          <div className="divide-y divide-slate-100">
            {grouped[md].map((f) => {
              const open = expandedId === f.match_id
              const goals = goalsByMatch[f.match_id] || []
              const homeGoals = goalsForTeam(goals, f.home_team_id)
              const awayGoals = goalsForTeam(goals, f.away_team_id)

              return (
                <div key={f.match_id}>
                  <button
                    type="button"
                    onClick={() => openMatch(f)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {f.home_team_crest && (
                          <img
                            src={f.home_team_crest}
                            alt=""
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <span className="text-sm font-medium truncate">
                          {f.home_team_name?.replace(' FC', '').replace(' AFC', '')}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 min-w-[56px] text-center">
                        {f.home_score}–{f.away_score}
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <span className="text-sm font-medium truncate text-right">
                          {f.away_team_name?.replace(' FC', '').replace(' AFC', '')}
                        </span>
                        {f.away_team_crest && (
                          <img
                            src={f.away_team_crest}
                            alt=""
                            className="w-6 h-6 object-contain"
                          />
                        )}
                      </div>
                    </div>
                    <p className="text-center text-[11px] text-slate-400 mt-1">
                      {formatKickoff(f.utc_date)} · FT
                      {open ? ' · Hide scorers' : ' · Show scorers'}
                    </p>
                  </button>

                  {open && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                      {loadingMatch === f.match_id && (
                        <p className="text-sm text-slate-500 py-3 text-center">
                          Loading scorers...
                        </p>
                      )}

                      {detailError && expandedId === f.match_id && (
                        <p className="text-sm text-red-600 py-3 text-center">{detailError}</p>
                      )}

                      {loadingMatch !== f.match_id && !detailError && (
                        <div className="grid grid-cols-2 gap-4 pt-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2 truncate">
                              {f.home_team_name?.replace(' FC', '').replace(' AFC', '')}
                            </p>
                            {homeGoals.length === 0 && awayGoals.length === 0 ? (
                              <p className="text-xs text-slate-400 col-span-2">
                                Scorers not provided by the data feed for this match
                              </p>
                            ) : homeGoals.length === 0 ? (
                              <p className="text-xs text-slate-400">No goals listed</p>
                            ) : (
                              <ul className="space-y-1">
                                {homeGoals.map((g, i) => (
                                  <li key={i} className="text-sm text-slate-800">
                                    <span className="font-semibold text-slate-500 w-8 inline-block">
                                      {g.minute}
                                      {g.injuryTime ? `+${g.injuryTime}` : ""}'
                                    </span>
                                    {g.scorer || 'Unknown'}
                                    {g.type === 'PENALTY' && (
                                      <span className="text-xs text-slate-400"> (pen)</span>
                                    )}
                                    {g.type === 'OWN' && (
                                      <span className="text-xs text-slate-400"> (og)</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-slate-500 mb-2 truncate">
                              {f.away_team_name?.replace(' FC', '').replace(' AFC', '')}
                            </p>
                            {awayGoals.length === 0 ? (
                              <p className="text-xs text-slate-400">No goals listed</p>
                            ) : (
                              <ul className="space-y-1">
                                {awayGoals.map((g, i) => (
                                  <li key={i} className="text-sm text-slate-800">
                                    {g.scorer || 'Unknown'}
                                    {g.type === 'PENALTY' && (
                                      <span className="text-xs text-slate-400"> (pen)</span>
                                    )}
                                    {g.type === 'OWN' && (
                                      <span className="text-xs text-slate-400"> (og)</span>
                                    )}
                                    <span className="font-semibold text-slate-500 w-8 inline-block ml-1">
                                      {g.minute}
                                      {g.injuryTime ? `+${g.injuryTime}` : ""}'
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
