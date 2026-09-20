'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function LeagueOverviewPage() {
  const params = useParams()
  const leagueId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comp, setComp] = useState<any>(null)
  const [me, setMe] = useState<any>(null)
  const [aliveCount, setAliveCount] = useState(0)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [myPick, setMyPick] = useState<any>(null)
  const [winner, setWinner] = useState<any>(null)
  const [leaving, setLeaving] = useState(false)

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

      const { data: competition, error: cErr } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', leagueId)
        .single()
      if (cErr) throw cErr
      setComp(competition)

      const { data: players } = await supabase
        .from('competition_players')
        .select('*')
        .eq('competition_id', leagueId)

      const list = players || []
      setTotalPlayers(list.length)
      setAliveCount(list.filter((p) => p.status === 'alive').length)

      const mine = list.find((p) => p.user_id === user.id)
      setMe(mine)

      if (competition.winner_player_id) {
        setWinner(list.find((p) => p.id === competition.winner_player_id) || null)
      }

      if (mine) {
        const { data: pick } = await supabase
          .from('picks')
          .select('*')
          .eq('player_id', mine.id)
          .eq('gameweek', competition.current_gameweek)
          .maybeSingle()
        setMyPick(pick)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!me) return
    const confirmed = window.confirm(
      `Leave "${comp?.name}"?\n\nThis removes you and your pick history from this league. You can rejoin later with the join code if it's still open.`
    )
    if (!confirmed) return

    setLeaving(true)
    setError('')
    try {
      const { error } = await supabase
        .from('competition_players')
        .delete()
        .eq('id', me.id)
      if (error) throw error
      router.push('/competitions')
    } catch (err: any) {
      setError(err.message)
      setLeaving(false)
    }
  }

  if (loading) {
    return <p className="text-slate-500 text-center">Loading overview...</p>
  }

  if (error) {
    return <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
  }

  const statusColour =
    comp?.status === 'active' || comp?.status === 'open'
      ? 'bg-emerald-100 text-emerald-800'
      : comp?.status === 'finished'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-slate-100 text-slate-700'

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColour}`}>
            {comp?.status}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Gameweek {comp?.current_gameweek}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
            {aliveCount} / {totalPlayers} alive
          </span>
        </div>

        <p className="text-sm text-slate-500">
          Join code{' '}
          <span className="font-mono font-bold text-slate-800">{comp?.join_code}</span>
        </p>

        {comp?.description && (
          <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3">
            {comp.description}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Your status
        </h2>
        {me ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-900">{me.display_name}</span>
              {me.status === 'alive' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Alive
                </span>
              )}
              {me.status === 'eliminated' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-white">
                  Eliminated{me.eliminated_gameweek ? ` · GW${me.eliminated_gameweek}` : ''}
                </span>
              )}
              {winner?.id === me.id && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                  Winner
                </span>
              )}
            </div>

            {me.status === 'alive' && (
              <div className="text-sm text-slate-600">
                {myPick ? (
                  <p>
                    This week’s pick:{' '}
                    <span className="font-semibold text-slate-900">{myPick.team_name}</span>
                  </p>
                ) : (
                  <p className="text-amber-700 font-medium">No pick yet for this gameweek</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">You are not in this league.</p>
        )}

        {me && !winner && (
          <button
            type="button"
            onClick={handleLeave}
            disabled={leaving}
            className="mt-4 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {leaving ? 'Leaving...' : 'Leave league'}
          </button>
        )}
      </div>

      {winner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-amber-900">Winner</p>
          <p className="text-lg font-bold text-amber-950 mt-1">{winner.display_name}</p>
        </div>
      )}
    </div>
  )
}