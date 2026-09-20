'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import TeamCrest from '@/components/TeamCrest'

export default function LeagueFixturesPage() {
  const params = useParams()
  const leagueId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [gameweek, setGameweek] = useState(1)
  const [thisWeek, setThisWeek] = useState<any[]>([])
  const [nextWeek, setNextWeek] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

      const { data: comp } = await supabase
        .from('competitions')
        .select('current_gameweek')
        .eq('id', leagueId)
        .single()

      const gw = comp?.current_gameweek || 1
      setGameweek(gw)

      const { data: a } = await supabase
        .from('fixtures_cache')
        .select('*')
        .eq('matchday', gw)
        .order('utc_date')
      setThisWeek(a || [])

      const { data: b } = await supabase
        .from('fixtures_cache')
        .select('*')
        .eq('matchday', gw + 1)
        .order('utc_date')
      setNextWeek(b || [])
    } finally {
      setLoading(false)
    }
  }

  const row = (f: any) => (
    <div key={f.match_id} className="flex items-center justify-between px-4 py-3 gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TeamCrest src={f.home_team_crest} className="w-6 h-6 object-contain shrink-0" />
        <span className="text-sm font-medium truncate">
          {f.home_team_name?.replace(' FC', '').replace(' AFC', '')}
        </span>
      </div>
      <div className="text-sm font-bold text-slate-800 min-w-[56px] text-center">
        {f.status === 'FINISHED' || f.home_score != null
          ? `${f.home_score ?? 0}–${f.away_score ?? 0}`
          : 'vs'}
      </div>
      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        <span className="text-sm font-medium truncate text-right">
          {f.away_team_name?.replace(' FC', '').replace(' AFC', '')}
        </span>
        <TeamCrest src={f.away_team_crest} className="w-6 h-6 object-contain shrink-0" />
      </div>
    </div>
  )

  if (loading) return <p className="text-slate-500 text-center">Loading fixtures...</p>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-semibold text-slate-800">
          This week · GW {gameweek}
        </div>
        <div className="divide-y divide-slate-100">
          {thisWeek.length ? (
            thisWeek.map(row)
          ) : (
            <p className="p-4 text-sm text-slate-500">No fixtures loaded.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-semibold text-slate-800">
          Next week · GW {gameweek + 1}
        </div>
        <div className="divide-y divide-slate-100">
          {nextWeek.length ? (
            nextWeek.map(row)
          ) : (
            <p className="p-4 text-sm text-slate-500">
              No fixtures for next week yet. Run fetch-fixtures for matchday {gameweek + 1}.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}