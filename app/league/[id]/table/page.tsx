'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

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

  const getTeamForm = (teamId: number, teamName: string) => {
    const matches = finishedFixtures
      .filter((f) => {
        if (f.home_team_id === teamId || f.away_team_id === teamId) return true
        if (namesMatch(f.home_team_name, teamName)) return true
        if (namesMatch(f.away_team_name, teamName)) return true
        return false
      })
      .sort(
        (a, b) =>
          new Date(b.utc_date).getTime() - new Date(a.utc_date).getTime()
      )
      .slice(0, 5)
      .reverse()

    return matches.map((match) => {
      const isHome =
        match.home_team_id === teamId ||
        namesMatch(match.home_team_name, teamName)
      const teamScore = isHome ? match.home_score : match.away_score
      const oppScore = isHome ? match.away_score : match.home_score
      const opponent = isHome ? match.away_team_name : match.home_team_name

      let result = 'D'
      if (teamScore > oppScore) result = 'W'
      else if (teamScore < oppScore) result = 'L'

      return {
        result,
        label: `${result} ${teamScore}-${oppScore} vs ${clean(opponent)}`,
      }
    })
  }

  if (loading) {
    return <p className="text-slate-500 text-center text-sm">Loading table...</p>
  }
  if (error) {
    return (
      <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
    )
  }
  if (!standings.length) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center text-slate-600 dark:text-slate-300 text-sm">
        No standings data yet.
      </div>
    )
  }

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Floating tooltip — not clipped by table overflow */}
      {tip && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
          style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, -110%)' }}
        >
          {tip.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] sm:text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <th className="text-left py-2 pl-2 pr-1 font-semibold w-7">#</th>
              <th className="text-left py-2 px-1 font-semibold min-w-[9rem]">Team</th>
              <th className="text-center py-2 px-1 font-semibold w-7">P</th>
              <th className="text-center py-2 px-1 font-semibold w-7">W</th>
              <th className="text-center py-2 px-1 font-semibold w-7">D</th>
              <th className="text-center py-2 px-1 font-semibold w-7">L</th>
              <th className="text-center py-2 px-1 font-semibold w-7 hidden xs:table-cell sm:table-cell">
                GF
              </th>
              <th className="text-center py-2 px-1 font-semibold w-7 hidden sm:table-cell">
                GA
              </th>
              <th className="text-center py-2 px-1 font-semibold w-8">GD</th>
              <th className="text-center py-2 pl-1 pr-2 font-bold w-8">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row: any) => {
              const team = row.team || row
              const teamId = team.id
              const teamName = team.name || team.shortName || ''
              const form = getTeamForm(teamId, teamName)

              return (
                <tr
                  key={teamId}
                  className="border-b border-slate-100 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  <td className="py-1.5 pl-2 pr-1 font-semibold text-slate-700 dark:text-slate-200 align-middle">
                    {row.position ?? row.rank}
                  </td>
                  <td className="py-1.5 px-1 align-middle">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {(team.crest || team.team_crest) && (
                        <img
                          src={team.crest || team.team_crest}
                          alt=""
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )}
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[7rem] sm:max-w-[10rem]">
                        {team.shortName || clean(team.name)}
                      </span>
                    </div>
                    {/* Form: always one row, no wrap */}
                    {form.length > 0 && (
                      <div className="flex flex-nowrap gap-0.5 mt-1 ml-5">
                        {form.map((f, i) => (
                          <button
                            key={i}
                            type="button"
                            title={f.label}
                            onMouseEnter={(e) => {
                              const r = (e.target as HTMLElement).getBoundingClientRect()
                              setTip({
                                text: f.label,
                                x: r.left + r.width / 2,
                                y: r.top,
                              })
                            }}
                            onMouseLeave={() => setTip(null)}
                            onFocus={(e) => {
                              const r = (e.target as HTMLElement).getBoundingClientRect()
                              setTip({
                                text: f.label,
                                x: r.left + r.width / 2,
                                y: r.top,
                              })
                            }}
                            onBlur={() => setTip(null)}
                            className={
                              'w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0 ' +
                              (f.result === 'W'
                                ? 'bg-emerald-500'
                                : f.result === 'D'
                                ? 'bg-slate-400'
                                : 'bg-red-500')
                            }
                          >
                            {f.result}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="text-center py-1.5 px-1 align-middle text-slate-700 dark:text-slate-300">
                    {row.playedGames ?? row.played}
                  </td>
                  <td className="text-center py-1.5 px-1 align-middle text-slate-700 dark:text-slate-300">
                    {row.won ?? row.wins}
                  </td>
                  <td className="text-center py-1.5 px-1 align-middle text-slate-700 dark:text-slate-300">
                    {row.draw ?? row.draws}
                  </td>
                  <td className="text-center py-1.5 px-1 align-middle text-slate-700 dark:text-slate-300">
                    {row.lost ?? row.losses}
                  </td>
                  <td className="text-center py-1.5 px-1 align-middle text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                    {row.goalsFor ?? row.gf}
                  </td>
                  <td className="text-center py-1.5 px-1 align-middle text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                    {row.goalsAgainst ?? row.ga}
                  </td>
                  <td className="text-center py-1.5 px-1 align-middle text-slate-700 dark:text-slate-300">
                    {row.goalDifference ?? row.gd}
                  </td>
                  <td className="text-center py-1.5 pl-1 pr-2 font-bold align-middle text-slate-900 dark:text-white">
                    {row.points ?? row.pts}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 px-3 py-1.5 border-t border-slate-100 dark:border-slate-700">
        Hover or long-press W / D / L for score and opponent · Form is last 5 (oldest → newest)
      </p>
    </div>
  )
}
