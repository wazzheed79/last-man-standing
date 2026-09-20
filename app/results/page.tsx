'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResultsPage() {
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadResults = async () => {
      try {
        const { data, error } = await supabase
          .from('fixtures_cache')
          .select('*')
          .eq('status', 'FINISHED')
          .order('matchday', { ascending: false })
          .order('utc_date', { ascending: true })

        if (error) throw error
        setFixtures(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [])

  // Group fixtures by matchday
  const grouped: Record<number, any[]> = {}
  fixtures.forEach((f) => {
    if (!grouped[f.matchday]) grouped[f.matchday] = []
    grouped[f.matchday].push(f)
  })

  const matchdays = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading results...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Previous Results</h1>
            <p className="text-xs text-slate-500">Premier League 2026/27</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Home
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {matchdays.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <p className="text-slate-600">No finished matches found. Load more fixtures first.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {matchdays.map((matchday) => (
              <div
                key={matchday}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="bg-slate-800 text-white px-4 py-3 font-semibold text-sm">
                  Matchday {matchday}
                </div>
                <div className="divide-y divide-slate-100">
                  {grouped[matchday].map((f) => (
                    <div
                      key={f.match_id}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition"
                    >
                      {/* Home team */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {f.home_team_crest && (
                          <img
                            src={f.home_team_crest}
                            alt=""
                            className="w-7 h-7 object-contain shrink-0"
                          />
                        )}
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {f.home_team_name
                            .replace(' FC', '')
                            .replace(' AFC', '')
                            .replace(' and Hove Albion', '')}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="px-4 font-bold text-base text-slate-900 min-w-[70px] text-center">
                        {f.home_score} – {f.away_score}
                      </div>

                      {/* Away team */}
                      <div className="flex items-center gap-2.5 flex-1 justify-end min-w-0">
                        <span className="text-sm font-medium text-slate-800 truncate text-right">
                          {f.away_team_name
                            .replace(' FC', '')
                            .replace(' AFC', '')
                            .replace(' and Hove Albion', '')}
                        </span>
                        {f.away_team_crest && (
                          <img
                            src={f.away_team_crest}
                            alt=""
                            className="w-7 h-7 object-contain shrink-0"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}