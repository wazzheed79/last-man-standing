'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function CreateCompetitionPage() {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [startGameweek, setStartGameweek] = useState<string>('auto')
  const [allowPickChanges, setAllowPickChanges] = useState(true)
  const [upcomingGameweeks, setUpcomingGameweeks] = useState<
    { matchday: number; deadline: string }[]
  >([])

  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [competitionId, setCompetitionId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUpcomingGameweeks()
  }, [])

  const loadUpcomingGameweeks = async () => {
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
      const { data, error } = await supabase.rpc('create_competition', {
        p_name: name,
        p_display_name: displayName.trim() || null,
        p_start_gameweek: startGameweek === 'auto' ? null : Number(startGameweek),
        p_description: description.trim() || null,
        p_allow_pick_changes: allowPickChanges,
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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Competition</h1>

        {!joinCode ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Competition Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Office LMS 2026"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Your display name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Defaults to your email prefix"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Prize / rules notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g. £5 entry, winner takes the pot"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Starting gameweek</label>
              <select
                value={startGameweek}
                onChange={(e) => setStartGameweek(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="auto">Automatic — next gameweek that hasn't started</option>
                {upcomingGameweeks.map((gw) => (
                  <option key={gw.matchday} value={gw.matchday}>
                    Gameweek {gw.matchday} — picks close {formatDeadline(gw.deadline)}
                  </option>
                ))}
              </select>
            </div>

            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPickChanges}
                  onChange={(e) => setAllowPickChanges(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">
                    Allow changing picks until first kick-off
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    If on, players can change their team for the current gameweek until the first
                    match of that week starts. If off, the first pick is locked.
                  </span>
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

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
            <p className="text-green-600 font-medium">Competition created!</p>
            <p className="text-sm text-gray-600">Share this join code with your friends:</p>
            <div className="bg-gray-100 text-2xl font-bold py-4 rounded tracking-wider">
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
              className="w-full bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
