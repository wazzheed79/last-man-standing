'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (error: any) {
      setMessage(error.message)
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
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg border border-transparent dark:border-slate-700">
          <div className="mb-4 flex justify-center">
            <Image
              src="/last-man-standing-crest.jpg"
              alt="Last Man Standing Competition badge"
              width={144}
              height={144}
              priority
              className="h-36 w-36 rounded-2xl border border-amber-200 bg-white object-cover shadow-sm"
            />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-center text-slate-900 dark:text-white">
            {isSignUp ? 'Create Account' : 'Login'}
          </h1>

          {/* Option bar - segmented control */}
          <div className="flex rounded-md overflow-hidden mb-6 border dark:border-slate-700">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors focus:outline-none ${
                !isSignUp
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors focus:outline-none ${
                isSignUp
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />

              {/* Forgot password link for login */}
              {!isSignUp && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.includes('Check your email')
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isSignUp ? 'Login' : 'Sign Up'}
            </button>
          </p>
        </div>

        {/* Accent option bar below card to stand out */}
        <div className="mt-4 p-3 rounded-md bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-center text-sm text-slate-700 dark:text-slate-300">
          <strong>Tip:</strong> Use the <em>Login</em> tab if you already have an account, otherwise create one with <em>Sign Up</em>.
        </div>
      </div>
    </div>
  )
}
