'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

export default function CreateCompetitionPage() {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [startGameweek, setStartGameweek] = useState<string>('auto')
  const [allowPickChanges, setAllowPickChanges] = useState(true)
  const [hidePicksUntilKo, setHidePicksUntilKo] = useState(false)
  const [upcomingGameweeks, setUpcomingGameweeks] = useState<
    { matchday: number; deadline: string }[]
  >([])

  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [competitionId, setCompetitionId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadUpcomingGameweeks()
  }, [])

  const loadUpcomingGameweeks = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('fixtures_cache')
      .select('matchday, utc_date')
      .order('utc_date')

    if (!data) return

    const byMatchday = new Map<number, string>()
    data.forEach((f: any) => {
      const existing = byMatchday.get(f.matchday)
      if (!existing || f.utc_date < existing) byMatchday.set(f.matchday, f.utc_date)
    })

    const now = new Date().toISOString()
    const upcoming = Array.from(byMatchday.entries())
      .filter(([, deadline]) => deadline > now)
      .map(([matchday, deadline]) => ({ matchday, deadline }))
      .sort((a, b) => a.matchday - b.matchday)

    setUpcomingGameweeks(upcoming)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setJoinCode('')

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_competition', {
        p_name: name,
        p_display_name: displayName.trim() || null,
        p_start_gameweek: startGameweek === 'auto' ? null : Number(startGameweek),
        p_description: description.trim() || null,
        p_allow_pick_changes: allowPickChanges,
        p_hide_picks_until_ko: hidePicksUntilKo,
      })

      if (error) throw error

      if (data && data.length > 0) {
        setJoinCode(data[0].join_code)
        setCompetitionId(data[0].competition_id)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDeadline = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })

  const inputClass =
    'w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md w-full max-w-md border border-transparent dark:border-slate-700">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-900 dark:text-white">
          Create Competition
        </h1>

        {!joinCode ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Competition Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Office LMS 2026"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Your display name{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Defaults to your email prefix"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                House rules{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g. bragging rights only — free to play, no prizes"
                className={`${inputClass} text-sm resize-none`}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                This game is free. Please don&apos;t use this box to collect an entry fee or offer a prize pot.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Starting gameweek
              </label>
              <select
                value={startGameweek}
                onChange={(e) => setStartGameweek(e.target.value)}
                className={inputClass}
              >
                <option value="auto">Automatic — next gameweek that hasn't started</option>
                {upcomingGameweeks.map((gw) => (
                  <option key={gw.matchday} value={gw.matchday}>
                    Gameweek {gw.matchday} — picks close {formatDeadline(gw.deadline)}
                  </option>
                ))}
              </select>
            </div>

            <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-3 bg-gray-50 dark:bg-slate-900/50 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPickChanges}
                  onChange={(e) => setAllowPickChanges(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-slate-100">
                    Allow changing picks until first kick-off
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Players can change their team until the first match of the week starts.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hidePicksUntilKo}
                  onChange={(e) => setHidePicksUntilKo(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-slate-100">
                    Hide other players' picks until first kick-off
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Stops people copying picks. Everyone can still see their own.
                  </span>
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Competition'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-green-600 dark:text-green-400 font-medium">Competition created!</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Share this join code with your friends:
            </p>
            <div className="bg-gray-100 dark:bg-slate-900 text-2xl font-bold py-4 rounded tracking-wider text-slate-900 dark:text-white">
              {joinCode}
            </div>
            <button
              onClick={() => router.push(`/league/${competitionId}`)}
              className="w-full bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 font-medium"
            >
              Go to League
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 py-2 rounded hover:bg-gray-300 dark:hover:bg-slate-600"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
