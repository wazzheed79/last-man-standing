'use client'

import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

function JoinCompetitionForm() {
  const [joinCode, setJoinCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [joinedId, setJoinedId] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) setJoinCode(code.toUpperCase())
  }, [searchParams])

  // Guests must sign in first; keep the join link for after auth
  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        const code = searchParams.get('code') || joinCode
        const next = code
          ? `/join?code=${encodeURIComponent(code.toUpperCase())}`
          : '/join'
        router.replace(
          `/login?next=${encodeURIComponent(next)}&mode=signup`
        )
        return
      }
      setCheckingAuth(false)
    }
    run()
  }, [router, searchParams, supabase.auth, joinCode])

  const finishJoin = async (code: string, data: any) => {
    let competitionId =
      data?.competition_id ||
      data?.id ||
      (Array.isArray(data) && data[0]?.competition_id) ||
      (Array.isArray(data) && data[0]?.id) ||
      null

    let name = data?.name || (Array.isArray(data) && data[0]?.name) || null

    if (!competitionId) {
      const { data: comp } = await supabase
        .from('competitions')
        .select('id, name')
        .eq('join_code', code)
        .maybeSingle()
      competitionId = comp?.id || null
      name = name || comp?.name || null
    }

    if (!competitionId) {
      throw new Error('Joined, but could not load the league. Open My Leagues.')
    }

    setMessage(
      name ? `Successfully joined "${name}"!` : 'Successfully joined!'
    )
    setJoinedId(competitionId)
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in')

      const code = joinCode.trim().toUpperCase()

      const { data, error: rpcError } = await supabase.rpc('join_competition', {
        p_join_code: code,
        p_display_name: displayName.trim() || null,
      })

      if (rpcError) {
        if (
          rpcError.message?.includes('Could not find') ||
          rpcError.message?.includes('schema cache') ||
          rpcError.code === 'PGRST202'
        ) {
          const { data: data2, error: rpcError2 } = await supabase.rpc(
            'join_competition',
            {
              join_code: code,
              display_name: displayName.trim() || null,
            }
          )
          if (rpcError2) throw rpcError2
          await finishJoin(code, data2)
          return
        }
        throw rpcError
      }

      await finishJoin(code, data)
    } catch (err: any) {
      setError(err.message || 'Unable to join')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
        <p className="text-slate-500">Checking login...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md w-full max-w-md border border-transparent dark:border-slate-700">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-900 dark:text-white">
          Join Competition
        </h1>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
              placeholder="e.g. LMS-UKXH"
              className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 uppercase tracking-wider bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
              className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {message && (
            <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
          )}

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
          type="button"
          onClick={() => router.push('/')}
          className="w-full mt-4 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 py-2 rounded hover:bg-gray-300 dark:hover:bg-slate-600"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}

export default function JoinCompetitionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <JoinCompetitionForm />
    </Suspense>
  )
}
