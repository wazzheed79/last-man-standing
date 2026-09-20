'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import TeamCrest from '@/components/TeamCrest'

export default function LeagueTablePage() {
  const [standings, setStandings] = useState<any[]>([])
  const [finishedFixtures, setFinishedFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  const shortName = (name: string) =>
    (name || '')
      .replace(' FC', '')
      .replace(' AFC', '')
      .replace(' and Hove Albion', '')
      .trim()
      .toLowerCase()

  const namesMatch = (a: string, b: string) => {
    const x = shortName(a)
    const y = shortName(b)
    return x === y || x.includes(y) || y.includes(x)
  }

  const getTeamForm = (teamId: number, teamName: string) => {
    const matches = finishedFixtures.filter((f) => {
      if (f.home_team_id === teamId || f.away_team_id === teamId) return true
      if (namesMatch(f.home_team_name, teamName)) return true
      if (namesMatch(f.away_team_name, teamName)) return true
      return false
    })

    // Already ordered newest first from the query
    return matches.slice(0, 5).map((match) => {
      const isHome =
        match.home_team_id === teamId || namesMatch(match.home_team_name, teamName)
      const teamScore = isHome ? match.home_score : match.away_score
      const oppScore = isHome ? match.away_score : match.home_score
      const opponent = isHome ? match.away_team_name : match.home_team_name

      let result = 'D'
      if (teamScore > oppScore) result = 'W'
      else if (teamScore < oppScore) result = 'L'

      return {
        result,
        label:
          result +
          ' ' +
          teamScore +
          '-' +
          oppScore +
          ' vs ' +
          shortName(opponent).replace(/\b\w/g, (c) => c.toUpperCase()),
      }
    })
  }

  if (loading) {
    return <p className="text-slate-500 text-center">Loading table...</p>
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
    )
  }

  if (!standings.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-600 text-sm">
        No standings data yet.
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="text-left py-3 px-3 w-10">#</th>
              <th className="text-left py-3 px-3 min-w-[150px]">Team</th>
              <th className="text-center py-3 px-2">P</th>
              <th className="text-center py-3 px-2">W</th>
              <th className="text-center py-3 px-2">D</th>
              <th className="text-center py-3 px-2">L</th>
              <th className="text-center py-3 px-2">GF</th>
              <th className="text-center py-3 px-2">GA</th>
              <th className="text-center py-3 px-2">GD</th>
              <th className="text-center py-3 px-2 font-bold">Pts</th>
              <th className="text-center py-3 px-4 min-w-[140px]">Form</th>
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
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-3 font-semibold text-slate-700">
                    {row.position ?? row.rank}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {(team.crest || team.team_crest) && (
                        <img
                          src={team.crest || team.team_crest}
                          alt=""
                          className="w-5 h-5 object-contain shrink-0"
                        />
                      )}
                      <span className="font-medium text-slate-900 whitespace-nowrap">
                        {team.shortName || team.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    {row.playedGames ?? row.played}
                  </td>
                  <td className="text-center py-3 px-2">{row.won ?? row.wins}</td>
                  <td className="text-center py-3 px-2">{row.draw ?? row.draws}</td>
                  <td className="text-center py-3 px-2">{row.lost ?? row.losses}</td>
                  <td className="text-center py-3 px-2">
                    {row.goalsFor ?? row.gf}
                  </td>
                  <td className="text-center py-3 px-2">
                    {row.goalsAgainst ?? row.ga}
                  </td>
                  <td className="text-center py-3 px-2">
                    {row.goalDifference ?? row.gd}
                  </td>
                  <td className="text-center py-3 px-2 font-bold">
                    {row.points ?? row.pts}
                  </td>
                  <td className="text-center py-3 px-4">
                    <div className="flex gap-1 justify-center items-center min-w-[130px]">
                      {form.length === 0 && (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                      {form.map((f, i) => (
                        <span
                          key={i}
                          title={f.label}
                          className={
                            'relative group w-6 h-6 rounded-full text-[11px] font-bold text-white flex items-center justify-center cursor-default shrink-0 ' +
                            (f.result === 'W'
                              ? 'bg-emerald-500'
                              : f.result === 'D'
                              ? 'bg-slate-400'
                              : 'bg-red-500')
                          }
                        >
                          {f.result}
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 whitespace-nowrap">
                            <span className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg">
                              {f.label}
                            </span>
                          </span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 px-4 py-2 border-t border-slate-100">
        Hover over W / D / L to see the score and opponent. Up to last 5 games.
      </p>
      </div>
    </div>
  )
}