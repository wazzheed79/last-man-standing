'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Countdown from '@/components/Countdown'
import { shortTeamName } from '@/lib/teamNames'

type SelectedTeam = {
  id: number
  name: string
  crest?: string | null
}

type UsedTeam = {
  id: number
  name: string
}

type FormItem = {
  result: 'W' | 'D' | 'L'
  label: string
}

export default function LeaguePickPage() {
  const params = useParams()
  const leagueId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [player, setPlayer] = useState<any>(null)
  const [comp, setComp] = useState<any>(null)
  const [fixtures, setFixtures] = useState<any[]>([])
  const [finishedFixtures, setFinishedFixtures] = useState<any[]>([])
  const [usedTeams, setUsedTeams] = useState<UsedTeam[]>([])
  const [currentPick, setCurrentPick] = useState<any>(null)
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    load(true)
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(false)
    }
    const interval = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [leagueId])

  const load = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
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

      const { data: me, error: meErr } = await supabase
        .from('competition_players')
        .select('*')
        .eq('competition_id', leagueId)
        .eq('user_id', user.id)
        .single()
      if (meErr) throw meErr
      setPlayer(me)

      if (me.status !== 'alive') {
        setLoading(false)
        return
      }

      const gw = competition.current_gameweek

      const { data: fixturesData } = await supabase
        .from('fixtures_cache')
        .select('*')
        .eq('matchday', gw)
        .order('utc_date')
      setFixtures(fixturesData || [])
      setLastUpdated(new Date())

      if (fixturesData && fixturesData.length > 0) {
        const firstKick = fixturesData.reduce(
          (min: string, f: any) => (f.utc_date < min ? f.utc_date : min),
          fixturesData[0].utc_date
        )
        setDeadline(new Date(firstKick))
      } else {
        setDeadline(null)
      }

      // Finished matches for form (last 5)
      const { data: finished } = await supabase
        .from('fixtures_cache')
        .select('*')
        .in('status', ['FINISHED', 'FT', 'AWARDED'])
        .order('utc_date', { ascending: false })
      setFinishedFixtures(finished || [])

      const { data: picksData } = await supabase
        .from('picks')
        .select('*')
        .eq('player_id', me.id)

      const cycleNumber = Number(competition.cycle_number ?? 1)
      const currentCyclePicks = (picksData || []).filter(
        (p: any) => Number(p.cycle_number ?? 1) === cycleNumber
      )
      const thisWeek = currentCyclePicks.find((p: any) => p.gameweek === gw) || null
      setCurrentPick(thisWeek)

      setUsedTeams(
        currentCyclePicks
          .filter((p: any) => p.gameweek !== gw)
          .map((p: any) => ({ id: p.team_id as number, name: p.team_name as string }))
      )
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

  const getTeamForm = (teamId: number, teamName: string): FormItem[] => {
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

      let result: 'W' | 'D' | 'L' = 'D'
      if (teamScore > oppScore) result = 'W'
      else if (teamScore < oppScore) result = 'L'

      return {
        result,
        label: `${result} ${teamScore}-${oppScore} vs ${clean(opponent)}`,
      }
    })
  }

  const canChangePick = () => {
    if (currentPick?.status === 'postponed') return true
    if (comp?.allow_pick_changes === false && currentPick) return false
    if (!deadline) return true
    return new Date() < deadline
  }

  const usedTeamIds = usedTeams.map((t) => t.id)
  const isBurned = (teamId: number) => usedTeamIds.includes(teamId)

  const hasUnsavedChanges =
    !!selectedTeam &&
    selectedTeam.id !== currentPick?.team_id &&
    canChangePick()

  const handleSelectTeam = (team: SelectedTeam) => {
    if (isBurned(team.id)) return
    if (!canChangePick() && currentPick) return
    setSelectedTeam(team)
    setMessage('')
    setError('')
  }

  const handlePick = async () => {
    if (!selectedTeam || !player || !comp) return
    if (!hasUnsavedChanges) return

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.rpc('make_pick', {
        p_competition_id: leagueId,
        p_team_id: selectedTeam.id,
        p_team_name: selectedTeam.name,
      })

      if (error) throw error

      const action = currentPick ? 'Changed' : 'Picked'
      setMessage(`${action} ${selectedTeam.name} for GW${comp.current_gameweek}`)
      setSelectedTeam(null)
      await load(false)
    } catch (err: any) {
      setError(err.message || 'Unable to save pick.')
    } finally {
      setSubmitting(false)
    }
  }

  const isLive = (status: string) => {
    const s = (status || '').toUpperCase()
    return ['IN_PLAY', 'LIVE', 'PAUSED', 'HALFTIME', 'HT'].includes(s)
  }

  const isFinished = (status: string) => {
    const s = (status || '').toUpperCase()
    return ['FINISHED', 'FT', 'AWARDED'].includes(s)
  }

  const scoreLabel = (f: any) => {
    if (isLive(f.status) || isFinished(f.status) || f.home_score != null) {
      return `${f.home_score ?? 0}-${f.away_score ?? 0}`
    }
    return 'vs'
  }

  if (loading) return <p className="text-slate-500 text-center py-8">Loading...</p>

  if (player && player.status !== 'alive') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
        <p className="text-slate-700 dark:text-slate-200 font-medium">You are eliminated</p>
        <p className="text-sm text-slate-500 mt-1">
          {player.eliminated_gameweek
            ? `You went out in Gameweek ${player.eliminated_gameweek}.`
            : 'You can still view players and results.'}
        </p>
      </div>
    )
  }

  if (comp && ['finished', 'archived'].includes(comp.status)) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
        <p className="text-slate-700 dark:text-slate-200 font-medium">This league is finished</p>
        <p className="text-sm text-slate-500 mt-1">Picking is closed.</p>
      </div>
    )
  }

  const locked = !canChangePick()
  const deadlineLabel = deadline
    ? deadline.toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-5 pb-32 sm:space-y-6">
      <section className="league-page-intro">
        <div>
          <p className="league-eyebrow"><span className="league-eyebrow__dot" /> Your gameweek decision</p>
          <h2 className="league-page-title">Make your pick</h2>
          <p className="league-page-subtitle">Choose one team to back this week. Once used, a team cannot be picked again.</p>
        </div>
        <div className="league-intro-tag"><span className="league-intro-tag__icon">GW</span> Gameweek {comp?.current_gameweek}</div>
      </section>

      <div className="flex justify-between items-center px-1">
        <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {lastUpdated
            ? `Refreshes about every minute · Updated ${lastUpdated.toLocaleTimeString()}`
            : 'Loading scores...'}
        </p>
        <button
          type="button"
          onClick={() => load(false)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
        >
          Refresh now
        </button>
      </div>

      <section className="league-pick-control">
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-amber-900 bg-amber-50 dark:bg-amber-900/40 dark:text-amber-100 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700">
            {deadline ? <Countdown deadline={deadline} /> : <span>No deadline yet</span>}
          </div>
          {deadlineLabel && (
            <span className="text-slate-400 text-[11px]">{deadlineLabel}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Current pick</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white truncate">
              {currentPick
                ? shortTeamName(currentPick.team_name)
                : 'No pick submitted'}
              {currentPick && !locked && (
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 align-middle text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">Saved</span>
              )}
              {currentPick && locked && (
                <span className="ml-2 rounded-full bg-slate-200 px-2 py-1 align-middle text-[10px] font-extrabold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200">Locked</span>
              )}
            </p>
          </div>
          <div className="text-right shrink-0 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Rule</p>
            <p className="mt-1 text-xs font-extrabold text-slate-800 dark:text-slate-100">
              {comp?.allow_pick_changes === false
                ? '1 pick - locked after'
                : '1 pick - no reuse'}
            </p>
          </div>
        </div>

        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">{error}</p>}
        {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">{message}</p>}
      </section>

      {usedTeams.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs">
          <p className="font-semibold text-slate-600 dark:text-slate-300 mb-2">
            Unavailable (already used)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {usedTeams.map((t) => (
              <span
                key={t.id}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-400 line-through px-2 py-0.5 rounded-md text-[11px] font-medium"
              >
                {shortTeamName(t.name)}
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="league-eyebrow">Pick from this week&apos;s fixtures</p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">Gameweek {comp?.current_gameweek}</h2>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tap a club to select</p>
        </div>

        {fixtures.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
            Fixtures for this gameweek haven&apos;t loaded yet. Refresh shortly, or contact the league organiser if they remain missing.
          </div>
        ) : (
          fixtures.map((f) => {
            const homeUsed = isBurned(f.home_team_id)
            const awayUsed = isBurned(f.away_team_id)
            const homeSelected = selectedTeam?.id === f.home_team_id
            const awaySelected = selectedTeam?.id === f.away_team_id
            const homeIsCurrent = currentPick?.team_id === f.home_team_id
            const awayIsCurrent = currentPick?.team_id === f.away_team_id
            const live = isLive(f.status)
            const finished = isFinished(f.status)
            const homeForm = getTeamForm(f.home_team_id, f.home_team_name)
            const awayForm = getTeamForm(f.away_team_id, f.away_team_name)

            const kickoffLabel = f.utc_date
              ? new Date(f.utc_date).toLocaleString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''

            const formRow = (form: FormItem[]) =>
              form.length > 0 ? (
                <div className="flex flex-nowrap gap-0.5 mt-1.5 justify-center">
                  {form.map((item, i) => (
                    <span
                      key={i}
                      title={item.label}
                      className={
                        'w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center shrink-0 ' +
                        (item.result === 'W'
                          ? 'bg-emerald-500'
                          : item.result === 'D'
                          ? 'bg-slate-400'
                          : 'bg-red-500')
                      }
                    >
                      {item.result}
                    </span>
                  ))}
                </div>
              ) : null

            const teamButton = (
              side: 'home' | 'away',
              teamId: number,
              teamName: string,
              crest: string | null,
              used: boolean,
              selected: boolean,
              isCurrent: boolean,
              form: FormItem[]
            ) => (
              <button
                type="button"
                disabled={used || (locked && !isCurrent)}
                onClick={() =>
                  handleSelectTeam({
                    id: teamId,
                    name: teamName,
                    crest,
                  })
                }
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all touch-manipulation active:scale-[0.98] min-h-[108px] ${
                  used
                    ? 'opacity-45 bg-slate-100 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 cursor-not-allowed'
                    : selected
                    ? 'bg-blue-50 dark:bg-blue-950/45 border-blue-500 shadow-lg shadow-blue-950/10 ring-2 ring-blue-500/15'
                    : isCurrent
                    ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {selected && (
                    <span className="absolute right-2 top-2 rounded-full bg-blue-600 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white">
                      Selected
                  </span>
                )}
                {used && (
                    <span className="absolute right-2 top-2 rounded-full bg-slate-200 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    Used
                  </span>
                )}
                {crest && (
                  <img
                    src={crest}
                    alt=""
                    className="w-9 h-9 object-contain mb-1"
                  />
                )}
                <span
                  className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight"
                  title={teamName}
                >
                  {shortTeamName(teamName)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {side === 'home' ? 'Home' : 'Away'}
                </span>
                {formRow(form)}
              </button>
            )

            return (
              <div
                key={f.match_id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
              >
                <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>
                    {kickoffLabel}
                    {live ? ' - LIVE' : finished ? ' - FT' : ''}
                  </span>
                  <span
                    className={`font-bold ${
                      live
                        ? 'text-red-600'
                        : finished
                        ? 'text-slate-800 dark:text-slate-100'
                        : 'text-slate-400'
                    }`}
                  >
                    {scoreLabel(f)}
                    {live && (
                      <span className="ml-1 animate-pulse text-[10px]">LIVE</span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2">
                  {teamButton(
                    'home',
                    f.home_team_id,
                    f.home_team_name,
                    f.home_team_crest,
                    homeUsed,
                    homeSelected,
                    homeIsCurrent,
                    homeForm
                  )}
                  {teamButton(
                    'away',
                    f.away_team_id,
                    f.away_team_name,
                    f.away_team_crest,
                    awayUsed,
                    awaySelected,
                    awayIsCurrent,
                    awayForm
                  )}
                </div>
              </div>
            )
          })
        )}
      </section>

      <aside className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/95 sm:p-4">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              {hasUnsavedChanges ? 'Selected pick' : currentPick ? 'Locked in' : 'Select a club above'}
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
              {selectedTeam
                ? shortTeamName(selectedTeam.name)
                : currentPick
                ? shortTeamName(currentPick.team_name)
                : 'None selected'}
            </p>
          </div>

          <button
            type="button"
            disabled={!hasUnsavedChanges || submitting}
            onClick={handlePick}
            className={`shrink-0 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm ${
              hasUnsavedChanges && !submitting
                ? 'bg-blue-600 text-white shadow-blue-900/20 hover:bg-blue-700 active:scale-95'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            {submitting
              ? 'Saving...'
              : locked && currentPick
              ? 'Pick locked'
              : hasUnsavedChanges
              ? currentPick
                ? 'Change pick'
                : 'Confirm pick'
              : currentPick
              ? 'Locked in'
              : 'Confirm pick'}
          </button>
        </div>
      </aside>
    </div>
  )
}
