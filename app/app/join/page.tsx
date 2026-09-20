'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function JoinCompetitionPage() {
  const [joinCode, setJoinCode] = useState('')
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [joinedId, setJoinedId] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) setJoinCode(code.toUpperCase())
  }, [searchParams])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const code = joinCode.trim().toUpperCase()

      // 1. Find the competition
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .select('id, name')
        .eq('join_code', code)
        .single()

      if (compError || !competition) {
        throw new Error('Competition not found. Check the join code.')
      }

      // 2. Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in')

      // 3. Check if already joined
      const { data: existing } = await supabase
        .from('competition_players')
        .select('id')
        .eq('competition_id', competition.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        setMessage(`You have already joined "${competition.name}"`)
        setJoinedId(competition.id)
        return
      }

      // 4. Join the competition
      const displayName = user.email?.split('@')[0] || 'Player'

      const { error: joinError } = await supabase
        .from('competition_players')
        .insert({
          competition_id: competition.id,
          user_id: user.id,
          display_name: displayName
        })

      if (joinError) throw joinError

      setMessage(`Successfully joined "${competition.name}"!`)
      setJoinedId(competition.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Join Competition</h1>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
              placeholder="e.g. LMS-UKXH"
              className="w-full border border-gray-300 rounded px-3 py-2 uppercase tracking-wider"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          {joinedId ? (
            <button
              type="button"
              onClick={() => router.push(`/league/${joinedId}`)}
              className="w-full bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 font-medium"
            >
              Go to League
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Competition'}
            </button>
          )}
        </form>

        <button
          onClick={() => router.push('/')}
          className="w-full mt-4 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}