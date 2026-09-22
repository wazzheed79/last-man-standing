'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import TeamCrest from '@/components/TeamCrest'

/** Short labels so names fit on narrow phone screens */
function shortTeamName(name: string | null | undefined): string {
  if (!name) return ''
  const n = name
    .replace(/ FC$/i, '')
    .replace(/ AFC$/i, '')
    .replace(/ and Hove Albion$/i, '')
    .trim()

  const map: Record<string, string> = {
    'Manchester United': 'Man Utd',
    'Manchester City': 'Man City',
    'Tottenham Hotspur': 'Spurs',
    'Nottingham Forest': "Nott'm Forest",
    Brighton: 'Brighton',
    'West Ham United': 'West Ham',
    'Wolverhampton Wanderers': 'Wolves',
    'Newcastle United': 'Newcastle',
    'Leicester City': 'Leicester',
    'Ipswich Town': 'Ipswich',
    'Crystal Palace': 'Palace',
    'AFC Bournemouth': 'Bournemouth',
    Bournemouth: 'Bournemouth',
    'Sheffield United': 'Sheffield Utd',
    'Leeds United': 'Leeds',
  }

  if (map[n]) return map[n]
  for (const [k, v] of Object.entries(map)) {
    if (n.includes(k) || k.includes(n)) return v
  }
  return n
}

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
      const {
        data: { user },
      } = await supabase.auth.getUser()
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

  const formatKickoff = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const row = (f: any) => {
    const home = shortTeamName(f.home_team_name)
    const away = shortTeamName(f.away_team_name)
    const score =
      f.status === 'FINISHED' || f.home_score != null
        ? `${f.home_score ?? 0}-${f.away_score ?? 0}`
        : 'vs'

    return (
      <div key={f.match_id} className="px-3 py-3 sm:px-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 min-w-0 justify-start">
            <TeamCrest
              src={f.home_team_crest}
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
            />
            <span
              className="text-xs sm:text-sm font-medium text-slate-900 leading-tight"
              title={f.home_team_name}
            >
              {home}
            </span>
          </div>

          <div className="text-xs sm:text-sm font-bold text-slate-800 px-1 text-center tabular-nums">
            {score}
          </div>

          <div className="flex items-center gap-1.5 min-w-0 justify-end">
            <span
              className="text-xs sm:text-sm font-medium text-slate-900 leading-tight text-right"
              title={f.away_team_name}
            >
              {away}
            </span>
            <TeamCrest
              src={f.away_team_crest}
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
            />
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-1.5">
          {formatKickoff(f.utc_date)}
          {f.status === 'TIMED' || f.status === 'SCHEDULED'
            ? ' · Kick-off'
            : f.status === 'IN_PLAY' || f.status === 'LIVE' || f.status === 'PAUSED'
            ? ' · Live'
            : f.status === 'FINISHED' || f.status === 'FT'
            ? ' · Full time'
            : ''}
        </p>
      </div>
    )
  }

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
              No fixtures for next week yet. Run fetch-fixtures for matchday{' '}
              {gameweek + 1}.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
