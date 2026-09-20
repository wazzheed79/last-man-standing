'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import TeamCrest from '@/components/TeamCrest'

export default function LeaguePicksPage() {
  const params = useParams()
  const leagueId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [comp, setComp] = useState<any>(null)
  const [gameweek, setGameweek] = useState<number | null>(null)
  const [picks, setPicks] = useState<any[]>([])
  const [crestMap, setCrestMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    init()
  }, [leagueId])

  useEffect(() => {
    if (gameweek !== null) loadPicks()
  }, [gameweek])

  const init = async () => {
    try {
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
      setGameweek(competition.current_gameweek)

      const { data: crests } = await supabase
        .from('fixtures_cache')
        .select('home_team_id, home_team_crest, away_team_id, away_team_crest')

      const map: Record<number, string> = {}
      ;(crests || []).forEach((f: any) => {
        if (f.home_team_id && f.home_team_crest) map[f.home_team_id] = f.home_team_crest
        if (f.away_team_id && f.away_team_crest) map[f.away_team_id] = f.away_team_crest
      })
      setCrestMap(map)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const loadPicks = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('picks')
        .select('team_id, team_name')
        .eq('competition_id', leagueId)
        .eq('gameweek', gameweek)

      if (error) throw error
      setPicks(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const counts = useMemo(() => {
    const map = new Map<number, { team_id: number; team_name: string; count: number }>()
    picks.forEach((p) => {
      const existing = map.get(p.team_id)
      if (existing) {
        existing.count += 1
      } else {
        map.set(p.team_id, { team_id: p.team_id, team_name: p.team_name, count: 1 })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [picks])

  const maxCount = counts[0]?.count || 1
  const totalPicks = picks.length

  const shortName = (name: string) =>
    (name || '').replace(' FC', '').replace(' AFC', '').replace(' and Hove Albion', '')

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700 shrink-0">Gameweek</label>
        <select
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          value={gameweek ?? ''}
          onChange={(e) => setGameweek(Number(e.target.value))}
        >
          {Array.from({ length: comp?.current_gameweek || 1 }, (_, i) => i + 1).map((gw) => (
            <option key={gw} value={gw}>
              Gameweek {gw}{gw === comp?.current_gameweek ? ' (current)' : ''}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-center">Loading picks...</p>
      ) : counts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <p className="text-slate-600">No picks made yet for this gameweek.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          <div className="px-4 py-2.5 bg-slate-50 text-xs font-medium text-slate-500">
            {totalPicks} pick{totalPicks === 1 ? '' : 's'} in
          </div>
          {counts.map((c) => (
            <div key={c.team_id} className="px-4 py-3">
              <div className="flex items-center gap-3 mb-1.5">
                <TeamCrest src={crestMap[c.team_id]} className="w-6 h-6 object-contain shrink-0" />
                <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                  {shortName(c.team_name)}
                </span>
                <span className="text-sm font-bold text-slate-900 shrink-0">{c.count}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.max(4, (c.count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
