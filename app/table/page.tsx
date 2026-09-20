'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function TablePage() {
  const [standings, setStandings] = useState<any[]>([])
  const [finishedFixtures, setFinishedFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
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
        setStandings(data.standings || [])

        const { data: fixtures, error: fixturesError } = await supabase
          .from('fixtures_cache')
          .select('*')
          .eq('status', 'FINISHED')
          .order('utc_date', { ascending: false })

        if (fixturesError) throw fixturesError
        setFinishedFixtures(fixtures || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const getTeamForm = (teamId: number) => {
    const matches = finishedFixtures
      .filter(f => f.home_team_id === teamId || f.away_team_id === teamId)
      .slice(0, 5)

    return matches.map(match => {
      const isHome = match.home_team_id === teamId
      const teamScore = isHome ? match.home_score : match.away_score
      const oppScore = isHome ? match.away_score : match.home_score
      const opponent = isHome ? match.away_team_name : match.home_team_name

      let result: 'W' | 'D' | 'L' = 'D'
      if (teamScore > oppScore) result = 'W'
      else if (teamScore < oppScore) result = 'L'

      const cleanOpponent = (opponent || '')
        .replace(' FC', '')
        .replace(' AFC', '')
        .replace(' and Hove Albion', '')

      return {
        result,
        tooltip: `${teamScore} - ${oppScore}  vs  ${cleanOpponent}`
      }
    })
  }

  // Shorten long team names cleanly
  const shortName = (name: string) => {
    return (name || '')
      .replace('Football Club', '')
      .replace(' FC', '')
      .replace(' AFC', '')
      .replace(' and Hove Albion', '')
      .trim()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading table...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Premier League Table</h1>
            <p className="text-xs text-slate-500">2026/27 Season</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Home
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="text-left py-3 px-3 font-semibold w-10">Pos</th>
                  <th className="text-left py-3 px-3 font-semibold min-w-[160px]">Team</th>
                  <th className="text-center py-3 px-2 font-semibold">P</th>
                  <th className="text-center py-3 px-2 font-semibold">W</th>
                  <th className="text-center py-3 px-2 font-semibold">D</th>
                  <th className="text-center py-3 px-2 font-semibold">L</th>
                  <th className="text-center py-3 px-2 font-semibold">GF</th>
                  <th className="text-center py-3 px-2 font-semibold">GA</th>
                  <th className="text-center py-3 px-2 font-semibold">GD</th>
                  <th className="text-center py-3 px-2 font-bold text-slate-900">Pts</th>
                  <th className="text-center py-3 px-3 font-semibold min-w-[120px]">Form</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, index) => {
                  const form = getTeamForm(row.team.id)
                  return (
                    <tr
                      key={row.team.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition ${
                        index < 4 ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {row.position}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {row.team.crest && (
                            <img
                              src={row.team.crest}
                              alt=""
                              className="w-6 h-6 object-contain shrink-0"
                            />
                          )}
                          <span className="font-medium text-slate-900 whitespace-nowrap">
                            {shortName(row.team.shortName || row.team.name)}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-slate-700">{row.playedGames}</td>
                      <td className="text-center py-3 px-2 text-slate-700">{row.won}</td>
                      <td className="text-center py-3 px-2 text-slate-700">{row.draw}</td>
                      <td className="text-center py-3 px-2 text-slate-700">{row.lost}</td>
                      <td className="text-center py-3 px-2 text-slate-700">{row.goalsFor}</td>
                      <td className="text-center py-3 px-2 text-slate-700">{row.goalsAgainst}</td>
                      <td className="text-center py-3 px-2 text-slate-700">{row.goalDifference}</td>
                      <td className="text-center py-3 px-2 font-bold text-slate-900">{row.points}</td>
                      <td className="text-center py-3 px-3">
                        <div className="flex gap-1 justify-center">
                          {form.length > 0 ? (
                            form.map((g, i) => (
                              <div key={i} className="relative group">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                                    g.result === 'W'
                                      ? 'bg-emerald-500'
                                      : g.result === 'D'
                                      ? 'bg-slate-400'
                                      : 'bg-red-500'
                                  }`}
                                >
                                  {g.result}
                                </span>

                                {/* Large tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                                  <div className="bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                                    {g.tooltip}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4 text-center">
          Hover over the form circles to see the full result.
        </p>
      </main>
    </div>
  )
}