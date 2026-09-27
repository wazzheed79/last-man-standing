'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ProcessResultsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [checkingAccess, setCheckingAccess] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: isAdmin } = await supabase.rpc('is_admin')
      if (!isAdmin) {
        router.push('/')
        return
      }
      setCheckingAccess(false)
    }
    checkAccess()
  }, [])

  const handleProcess = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) throw new Error('Please sign in again before running weekly updates.')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-results`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      )

      const data = await res.json()
      if (!res.ok || data.success === false || data.error) {
        throw new Error(data.error || 'Could not process the current gameweek.')
      }
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-500">Checking access...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Run Weekly Updates</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Update results across active leagues</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"
          >
            Home
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <button
            onClick={handleProcess}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-medium transition"
          >
            {loading ? 'Updating...' : 'Run weekly updates'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-xl text-sm space-y-1">
            <p className="font-semibold">Weekly updates completed</p>
            <p>Updates applied: {result.data ?? 0}</p>
          </div>
        )}

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium mb-1">What this does</p>
          <p className="text-amber-700 dark:text-amber-300">
            Checks the current gameweek in every active league, applies finished scores and missed-pick rules, and advances leagues when all fixtures are resolved. This also runs automatically every five minutes.
          </p>
        </div>
      </main>
    </div>
  )
}

