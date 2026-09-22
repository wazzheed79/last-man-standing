'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function FeedbackPage() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [allFeedback, setAllFeedback] = useState<any[]>([])
  const [checkingAccess, setCheckingAccess] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: admin } = await supabase.rpc('is_admin')
      setIsAdmin(!!admin)

      if (admin) {
        const { data } = await supabase
          .from('feedback')
          .select('*')
          .order('created_at', { ascending: false })
        setAllFeedback(data || [])
      }

      setCheckingAccess(false)
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in')

      const { error: insertError } = await supabase.from('feedback').insert({
        user_id: user.id,
        message: message.trim(),
      })

      if (insertError) throw insertError

      setSubmitted(true)
      setMessage('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Feedback</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ideas, bugs, anything</p>
          </div>
          <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-emerald-600 dark:text-emerald-400 font-medium mb-3">
                Thanks — got it!
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Got an idea for a feature, or found something broken?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="e.g. It'd be good if..."
                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm resize-none"
              />
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Feedback'}
              </button>
            </form>
          )}
        </div>

        {isAdmin && (
          <div>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              All feedback ({allFeedback.length})
            </h2>
            {allFeedback.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Nothing submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {allFeedback.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                      {f.message}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      {new Date(f.created_at).toLocaleString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
