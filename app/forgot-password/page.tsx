'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setMessage('Password reset email sent. Check your inbox.')
      setEmail('')
    } catch (err: any) {
      setError(err.message || 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <h1 className="text-2xl font-bold mb-2 text-center text-slate-900 dark:text-white">
            Reset Password
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
            Enter your email and we’ll send you a reset link.
          </p>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {message && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
