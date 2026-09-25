'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LeagueOverviewPage() {
  const params = useParams()
  const leagueId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comp, setComp] = useState<any>(null)
  const [me, setMe] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [aliveCount, setAliveCount] = useState(0)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [myPick, setMyPick] = useState<any>(null)
  const [winner, setWinner] = useState<any>(null)
  const [leaving, setLeaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [joinUrl, setJoinUrl] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set())
  const [allPicks, setAllPicks] = useState<any[]>([])
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [notifMsg, setNotifMsg] = useState('')

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
      setUserId(user.id)

      const { data: competition, error: cErr } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', leagueId)
        .single()
      if (cErr) throw cErr
      setComp(competition)

      if (typeof window !== 'undefined' && competition?.join_code) {
        setJoinUrl(
          `${window.location.origin}/join?code=${encodeURIComponent(competition.join_code)}`
        )
      }

      const { data: playersData } = await supabase
        .from('competition_players')
        .select('*')
        .eq('competition_id', leagueId)
        .order('joined_at', { ascending: true })

      const list = playersData || []
      setPlayers(list)
      setTotalPlayers(list.length)
      setAliveCount(list.filter((p) => p.status === 'alive').length)

      const mine = list.find((p) => p.user_id === user.id)
      setMe(mine)

      if (competition.winner_player_id) {
        setWinner(list.find((p) => p.id === competition.winner_player_id) || null)
      }

      const gw = competition.current_gameweek
      const cycleNumber = Number(competition.cycle_number ?? 1)

      const { data: gwFixtures } = await supabase
        .from('fixtures_cache')
        .select('utc_date')
        .eq('matchday', gw)
        .order('utc_date')
      if (gwFixtures && gwFixtures.length > 0) {
        setDeadline(new Date(gwFixtures[0].utc_date))
      }

      const { data: picksData } = await supabase
        .from('picks')
        .select('*')
        .eq('competition_id', leagueId)
      const allPicksInCycle = (picksData || []).filter(
        (p: any) => Number(p.cycle_number ?? 1) === cycleNumber
      )
      setAllPicks(allPicksInCycle)

      const thisGwPicked = new Set(
        allPicksInCycle
          .filter((p: any) => p.gameweek === gw)
          .map((p: any) => p.player_id as string)
      )
      setPickedIds(thisGwPicked)

      if (mine) {
        const pick = allPicksInCycle.find(
          (p: any) => p.player_id === mine.id && p.gameweek === gw
        )
        setMyPick(pick || null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyJoin = async () => {
    const text = joinUrl || comp?.join_code || ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy - select the code manually')
    }
  }

  const handleLeave = async () => {
    if (!me) return
    const confirmed = window.confirm(
      `Leave "${comp?.name}"?\n\nThis removes you and your pick history from this league.`
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

  const exportCsv = () => {
    const byPlayer = new Map<string, any[]>()
    allPicks.forEach((p) => {
      const list = byPlayer.get(p.player_id) || []
      list.push(p)
      byPlayer.set(p.player_id, list)
    })
    const maxGw = Math.max(
      0,
      ...allPicks.map((p) => p.gameweek || 0),
      comp?.current_gameweek || 0
    )
    const headers = ['Player', 'Status', 'Eliminated GW']
    for (let g = 1; g <= maxGw; g++) headers.push(`GW${g}`)
    const rows = [headers.join(',')]
    players.forEach((pl) => {
      const picks = (byPlayer.get(pl.id) || []).sort(
        (a, b) => a.gameweek - b.gameweek
      )
      const byGw = new Map(picks.map((p) => [p.gameweek, p.team_name]))
      const cols = [
        `"${(pl.display_name || '').replace(/"/g, '""')}"`,
        pl.status,
        pl.eliminated_gameweek ?? '',
      ]
      for (let g = 1; g <= maxGw; g++) {
        cols.push(`"${(byGw.get(g) || '').replace(/"/g, '""')}"`)
      }
      rows.push(cols.join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(comp?.name || 'league').replace(/\s+/g, '-')}-picks.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareAlive = async () => {
    const text = me?.status === 'alive'
      ? `Still alive in ${comp?.name} — Last Man Standing GW${comp?.current_gameweek}!`
      : `I went out in GW${me?.eliminated_gameweek || '?'} in ${comp?.name}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Last Man Standing', text, url: joinUrl || window.location.href })
      } else {
        await navigator.clipboard.writeText(text)
        setNotifMsg('Status copied to clipboard')
        setTimeout(() => setNotifMsg(''), 2000)
      }
    } catch {
      /* user cancelled */
    }
  }

  const enableReminders = async () => {
    if (!('Notification' in window)) {
      setNotifMsg('Notifications not supported on this browser')
      return
    }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      setNotifMsg('Notification permission denied')
      return
    }
    localStorage.setItem(`lms-remind-${leagueId}`, '1')
    setNotifMsg('Reminders enabled on this device')
    setTimeout(() => setNotifMsg(''), 2500)

    if (deadline && deadline.getTime() > Date.now() && !myPick && me?.status === 'alive') {
      const ms = deadline.getTime() - Date.now() - 2 * 60 * 60 * 1000
      if (ms > 0 && ms < 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          if (localStorage.getItem(`lms-remind-${leagueId}`) === '1') {
            new Notification('Last Man Standing', {
              body: `Pick deadline soon for ${comp?.name || 'your league'} (GW${comp?.current_gameweek})`,
              icon: '/icon.svg',
            })
          }
        }, ms)
      }
    }
  }

  if (loading) {
    return <p className="text-slate-500 text-center">Loading overview...</p>
  }

  if (error && !comp) {
    return <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
  }

  const statusColour =
    comp?.status === 'active' || comp?.status === 'open'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
      : comp?.status === 'finished'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'

  const alive = players.filter((p) => p.status === 'alive')
  const out = players
    .filter((p) => p.status === 'eliminated')
    .sort((a, b) => (a.eliminated_gameweek || 99) - (b.eliminated_gameweek || 99))

  const isCreator = comp?.created_by === userId
  const needsPick =
    me?.status === 'alive' &&
    !myPick &&
    ['open', 'active'].includes(comp?.status) &&
    (!deadline || deadline.getTime() > Date.now())

  const notPickedAlive = alive.filter((p) => !pickedIds.has(p.id))
  const pickedAlive = alive.filter((p) => pickedIds.has(p.id))

  const qrSrc = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(joinUrl)}`
    : ''

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}
      {notifMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-lg text-sm">
          {notifMsg}
        </div>
      )}

      {needsPick && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
              You haven't picked for Gameweek {comp?.current_gameweek}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-200/80 mt-0.5">
              {deadline
                ? `Deadline: ${deadline.toLocaleString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Pick before the first kick-off'}
            </p>
          </div>
          <Link
            href={`/league/${leagueId}/pick`}
            className="shrink-0 text-center bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Make pick
          </Link>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColour}`}
          >
            {comp?.status}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            Gameweek {comp?.current_gameweek}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
            {aliveCount} / {totalPlayers} alive
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500 dark:text-slate-400">Join code</p>
            <p className="font-mono font-bold text-xl text-slate-900 dark:text-white tracking-wider">
              {comp?.join_code}
            </p>
            {joinUrl && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-all">{joinUrl}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              <button
                type="button"
                onClick={copyJoin}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copied ? 'Copied!' : 'Copy join link'}
              </button>
              <button
                type="button"
                onClick={shareAlive}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Share my status
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={enableReminders}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Enable pick reminders
              </button>
            </div>
          </div>
          {qrSrc && (
            <div className="shrink-0 text-center">
              <img
                src={qrSrc}
                alt="Join QR code"
                className="w-28 h-28 rounded-lg border border-slate-200 dark:border-slate-600 bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">Scan to join</p>
            </div>
          )}
        </div>

        {comp?.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 whitespace-pre-wrap border-t border-slate-100 dark:border-slate-700 pt-3">
            {comp.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{aliveCount}</p>
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase mt-1">
            Alive
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-600 dark:text-red-300">
            {totalPlayers - aliveCount}
          </p>
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase mt-1">Out</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Your status
        </h2>
        {me ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-900 dark:text-white">{me.display_name}</span>
              {me.status === 'alive' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  Alive
                </span>
              )}
              {me.status === 'eliminated' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">
                  Out{me.eliminated_gameweek ? ` · GW${me.eliminated_gameweek}` : ''}
                </span>
              )}
              {winner?.id === me.id && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                  Winner
                </span>
              )}
            </div>

            {me.status === 'alive' && (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {myPick ? (
                  <p>
                    This week's pick:{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {myPick.team_name}
                    </span>
                  </p>
                ) : (
                  <p className="text-amber-700 dark:text-amber-400 font-medium">
                    No pick yet for this gameweek
                  </p>
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

      {isCreator && ['open', 'active'].includes(comp?.status) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            GW{comp?.current_gameweek} pick status (creator)
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                Picked ({pickedAlive.length})
              </p>
              {pickedAlive.length === 0 ? (
                <p className="text-slate-400 text-xs">Nobody yet</p>
              ) : (
                <ul className="space-y-1">
                  {pickedAlive.map((p) => (
                    <li key={p.id} className="text-slate-800 dark:text-slate-200">
                      {p.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                Not picked ({notPickedAlive.length})
              </p>
              {notPickedAlive.length === 0 ? (
                <p className="text-slate-400 text-xs">Everyone has picked</p>
              ) : (
                <ul className="space-y-1">
                  {notPickedAlive.map((p) => (
                    <li key={p.id} className="text-slate-800 dark:text-slate-200">
                      {p.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Team names stay hidden here if "hide picks until KO" is on — only pick status is shown.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Still alive ({alive.length})
        </h2>
        {alive.length === 0 ? (
          <p className="text-sm text-slate-500">No one left.</p>
        ) : (
          <ul className="space-y-2">
            {alive.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-medium text-slate-900 dark:text-white">{p.display_name}</span>
                {winner?.id === p.id && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-amber-950">
                    Winner
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {out.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Eliminated
          </h2>
          <ul className="space-y-2">
            {out.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">{p.display_name}</span>
                </span>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Out GW{p.eliminated_gameweek || '?'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {winner && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-5">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Winner</p>
          <p className="text-lg font-bold text-amber-950 dark:text-amber-100 mt-1">
            {winner.display_name}
          </p>
        </div>
      )}
    </div>
  )
}
