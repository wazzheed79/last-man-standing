'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { shortTeamName } from '@/lib/teamNames'

export default function LeagueResultsPage() {
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
    setFixtures(data || [])
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
            {grouped[md].map((f) => (
              <div key={f.match_id} className="px-3 py-3 sm:px-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 justify-start">
                    {f.home_team_crest && (
                      <img
                        src={f.home_team_crest}
                        alt=""
                        className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                      />
                    )}
                    <span
                      className="text-xs sm:text-sm font-medium text-slate-900 leading-tight"
                      title={f.home_team_name}
                    >
                      {shortTeamName(f.home_team_name)}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm px-1 text-center tabular-nums">
                    {f.home_score}-{f.away_score}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 justify-end">
                    <span
                      className="text-xs sm:text-sm font-medium text-slate-900 leading-tight text-right"
                      title={f.away_team_name}
                    >
                      {shortTeamName(f.away_team_name)}
                    </span>
                    {f.away_team_crest && (
                      <img
                        src={f.away_team_crest}
                        alt=""
                        className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                      />
                    )}
                  </div>
                </div>
                <p className="text-center text-[11px] text-slate-400 mt-1">
                  {formatKickoff(f.utc_date)} · FT
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
