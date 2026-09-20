'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ProcessResultsPage() {
  const [matchday, setMatchday] = useState(2)
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-results`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ matchday }),
        }
      )

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Checking access...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Process Results</h1>
            <p className="text-xs text-slate-500">Update picks and eliminate players</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Home
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Matchday / Gameweek
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
              value={matchday}
              onChange={(e) => setMatchday(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((n) => (
                <option key={n} value={n}>
                  Gameweek {n}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleProcess}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-medium transition"
          >
            {loading ? 'Processing...' : 'Process Results'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm space-y-1">
            <p className="font-semibold">Results processed successfully</p>
            <p>Gameweek: {result.matchday}</p>
            <p>Picks updated: {result.updated_picks}</p>
            <p>Players eliminated: {result.eliminated_players}</p>
            {result.message && <p>{result.message}</p>}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">How to use</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-700">
            <li>Make sure fixtures for the gameweek are marked as FINISHED with scores</li>
            <li>Select the gameweek above</li>
            <li>Click Process Results</li>
            <li>Players who drew or lost will be eliminated</li>
          </ol>
        </div>
      </main>
    </div>
  )
}