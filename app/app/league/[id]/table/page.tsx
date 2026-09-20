'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

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
    // All finished games for this team, newest first
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
      // Only the last 5 results — oldest drops off when a 6th arrives
      .slice(0, 5)
      // Display left → right as oldest → newest (usual form style)
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
        label: result + ' ' + teamScore + '-' + oppScore + ' vs ' + clean(opponent),
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="text-left py-3 px-3">#</th>
              <th className="text-left py-3 px-3">Team</th>
              <th className="text-center py-3 px-2">P</th>
              <th className="text-center py-3 px-2">W</th>
              <th className="text-center py-3 px-2">D</th>
              <th className="text-center py-3 px-2">L</th>
              <th className="text-center py-3 px-2">GF</th>
              <th className="text-center py-3 px-2">GA</th>
              <th className="text-center py-3 px-2">GD</th>
              <th className="text-center py-3 px-2 font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row: any) => {
              const team = row.team || row
              const teamId = team.id
              const teamName = team.name || team.shortName || ''
              const form = getTeamForm(teamId, teamName)

              return (
                <tr key={teamId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-3 font-semibold align-top">
                    {row.position ?? row.rank}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      {(team.crest || team.team_crest) && (
                        <img
                          src={team.crest || team.team_crest}
                          alt=""
                          className="w-5 h-5 object-contain"
                        />
                      )}
                      <span className="font-medium whitespace-nowrap">
                        {team.shortName || clean(team.name)}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {form.map((f, i) => (
                        <span
                          key={i}
                          title={f.label}
                          className={
                            'relative group w-6 h-6 rounded-full text-[11px] font-bold text-white flex items-center justify-center cursor-default ' +
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
                  <td className="text-center py-3 px-2 align-top">
                    {row.playedGames ?? row.played}
                  </td>
                  <td className="text-center py-3 px-2 align-top">
                    {row.won ?? row.wins}
                  </td>
                  <td className="text-center py-3 px-2 align-top">
                    {row.draw ?? row.draws}
                  </td>
                  <td className="text-center py-3 px-2 align-top">
                    {row.lost ?? row.losses}
                  </td>
                  <td className="text-center py-3 px-2 align-top">
                    {row.goalsFor ?? row.gf}
                  </td>
                  <td className="text-center py-3 px-2 align-top">
                    {row.goalsAgainst ?? row.ga}
                  </td>
                  <td className="text-center py-3 px-2 align-top">
                    {row.goalDifference ?? row.gd}
                  </td>
                  <td className="text-center py-3 px-2 font-bold align-top">
                    {row.points ?? row.pts}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 px-4 py-2 border-t border-slate-100">
        Hover over W / D / L to see score and opponent
      </p>
    </div>
  )
}
