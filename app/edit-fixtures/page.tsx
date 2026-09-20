'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function EditFixturesPage() {
  const [matchday, setMatchday] = useState(2)
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const [newHome, setNewHome] = useState('')
  const [newAway, setNewAway] = useState('')
  const [newHomeScore, setNewHomeScore] = useState('')
  const [newAwayScore, setNewAwayScore] = useState('')

  const router = useRouter()
  const supabase = createClient()
  const [checkingAccess, setCheckingAccess] = useState(true)

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

  useEffect(() => {
    if (!checkingAccess) loadFixtures()
  }, [matchday, checkingAccess])

  const loadFixtures = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('fixtures_cache')
        .select('*')
        .eq('matchday', matchday)
        .order('utc_date')

      if (error) throw error
      setFixtures(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (matchId: number, field: string, value: any) => {
    setFixtures(prev =>
      prev.map(f =>
        f.match_id === matchId ? { ...f, [field]: value } : f
      )
    )
  }

  const handleSave = async (fixture: any) => {
    setSavingId(fixture.match_id)
    setMessage('')
    setError('')

    try {
      const { error } = await supabase
        .from('fixtures_cache')
        .update({
          home_team_name: fixture.home_team_name,
          away_team_name: fixture.away_team_name,
          home_score: fixture.home_score === '' || fixture.home_score === null ? null : Number(fixture.home_score),
          away_score: fixture.away_score === '' || fixture.away_score === null ? null : Number(fixture.away_score),
          matchday: Number(fixture.matchday),
          status: fixture.status || 'FINISHED',
          is_manual: true,
          updated_at: new Date().toISOString()
        })
        .eq('match_id', fixture.match_id)

      if (error) throw error
      setMessage('Fixture saved (protected as manual)')
      await loadFixtures()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const handleAddFixture = async () => {
    if (!newHome.trim() || !newAway.trim()) {
      setError('Both team names are required')
      return
    }

    setMessage('')
    setError('')

    try {
      const matchId = Date.now()

      const { error } = await supabase.from('fixtures_cache').insert({
        season: '2026',
        matchday: matchday,
        match_id: matchId,
        utc_date: new Date().toISOString(),
        status: 'FINISHED',
        home_team_id: matchId,
        home_team_name: newHome.trim(),
        away_team_id: matchId + 1,
        away_team_name: newAway.trim(),
        home_score: newHomeScore === '' ? null : Number(newHomeScore),
        away_score: newAwayScore === '' ? null : Number(newAwayScore),
        is_manual: true,
        updated_at: new Date().toISOString()
      })

      if (error) throw error

      setMessage('New manual fixture added')
      setNewHome('')
      setNewAway('')
      setNewHomeScore('')
      setNewAwayScore('')
      setShowAdd(false)
      await loadFixtures()
    } catch (err: any) {
      setError(err.message)
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
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Edit Fixtures</h1>
            <p className="text-xs text-slate-500">Manual fixtures are protected from being overwritten</p>
          </div>
          <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Home
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Matchday</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
              value={matchday}
              onChange={(e) => setMatchday(Number(e.target.value))}
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(n => (
                <option key={n} value={n}>Matchday {n}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            {showAdd ? 'Cancel' : '+ Add Fixture'}
          </button>
        </div>

        {message && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">{message}</div>}
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {showAdd && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
            <h3 className="font-semibold text-slate-800">Add New Fixture</h3>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Home team" value={newHome} onChange={(e) => setNewHome(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input type="text" placeholder="Away team" value={newAway} onChange={(e) => setNewAway(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Home score" value={newHomeScore} onChange={(e) => setNewHomeScore(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Away score" value={newAwayScore} onChange={(e) => setNewAwayScore(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={handleAddFixture} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Add Fixture
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-center text-slate-500">Loading...</p>
        ) : fixtures.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center text-slate-600">
            No fixtures for Matchday {matchday}
          </div>
        ) : (
          <div className="space-y-3">
            {fixtures.map((f) => (
              <div key={f.match_id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
                {f.is_manual && (
                  <span className="inline-block text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                    Manual (protected)
                  </span>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={f.home_team_name || ''}
                    onChange={(e) => updateField(f.match_id, 'home_team_name', e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={f.away_team_name || ''}
                    onChange={(e) => updateField(f.match_id, 'away_team_name', e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center justify-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={f.home_score ?? ''}
                    onChange={(e) => updateField(f.match_id, 'home_score', e.target.value)}
                    className="w-16 border border-slate-300 rounded-lg text-center py-2 text-sm font-semibold"
                  />
                  <span className="text-slate-400 font-medium">–</span>
                  <input
                    type="number"
                    min="0"
                    value={f.away_score ?? ''}
                    onChange={(e) => updateField(f.match_id, 'away_score', e.target.value)}
                    className="w-16 border border-slate-300 rounded-lg text-center py-2 text-sm font-semibold"
                  />
                </div>

                {/* Move to different matchday */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Matchday:</label>
                  <select
                    value={f.matchday}
                    onChange={(e) => updateField(f.match_id, 'matchday', Number(e.target.value))}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    f.status === 'FINISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {f.status}
                  </span>
                  <button
                    onClick={() => handleSave(f)}
                    disabled={savingId === f.match_id}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {savingId === f.match_id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}