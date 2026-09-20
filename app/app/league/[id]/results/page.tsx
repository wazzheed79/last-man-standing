'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import TeamCrest from '@/components/TeamCrest'

export default function LeagueResultsPage() {
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const loadResults = async () => {
      try {
        const { data, error } = await supabase
          .from('fixtures_cache')
          .select('*')
          .eq('status', 'FINISHED')
          .order('matchday', { ascending: false })
          .order('utc_date', { ascending: true })

        if (error) throw error
        setFixtures(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [])

  // Group fixtures by matchday
  const grouped: Record<number, any[]> = {}
  fixtures.forEach((f) => {
    if (!grouped[f.matchday]) grouped[f.matchday] = []
    grouped[f.matchday].push(f)
  })

  const matchdays = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a)

  const shortName = (name: string) =>
    (name || '')
      .replace(' FC', '')
      .replace(' AFC', '')
      .replace(' and Hove Albion', '')

  if (loading) {
    return <p className="text-slate-500 text-center">Loading results...</p>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {matchdays.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <p className="text-slate-600">No finished matches found yet.</p>
        </div>
      ) : (
        matchdays.map((matchday) => (
          <div
            key={matchday}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="bg-slate-800 text-white px-4 py-3 font-semibold text-sm">
              Matchday {matchday}
            </div>
            <div className="divide-y divide-slate-100">
              {grouped[matchday].map((f) => (
                <div
                  key={f.match_id}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {f.home_team_crest && (
                      <TeamCrest src={f.home_team_crest} className="w-7 h-7 object-contain shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {shortName(f.home_team_name)}
                    </span>
                  </div>

                  <div className="px-4 font-bold text-base text-slate-900 min-w-[70px] text-center">
                    {f.home_score} – {f.away_score}
                  </div>

                  <div className="flex items-center gap-2.5 flex-1 justify-end min-w-0">
                    <span className="text-sm font-medium text-slate-800 truncate text-right">
                      {shortName(f.away_team_name)}
                    </span>
                    {f.away_team_crest && (
                      <TeamCrest src={f.away_team_crest} className="w-7 h-7 object-contain shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
