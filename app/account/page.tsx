'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>('default')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationStatus(Notification.permission)
      } else {
        setNotificationStatus('unsupported')
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Notifications are not supported by this browser/device.')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      setNotificationStatus(permission)
      if (permission === 'granted') {
        new Notification('Last Man Standing', {
          body: 'Pick reminders enabled! You will be reminded before kickoff deadlines.',
          icon: '/icon-192.png?v=2',
        })
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Please type DELETE in capital letters to confirm.')
      return
    }

    setDeleting(true)
    setError('')

    try {
      const { error: rpcError } = await supabase.rpc('delete_own_account')

      if (rpcError) {
        const raw = rpcError.message || ''
        const notReady = /delete_own_account|PGRST202|schema cache|Could not find the function/i.test(raw)
        setError(
          notReady
            ? 'Account deletion is not switched on in the database yet. Use Feedback and ask for your account to be removed.'
            : raw
        )
        setDeleting(false)
        return
      }

      await supabase.auth.signOut()
      router.push('/login?message=' + encodeURIComponent('Your account has been deleted.'))
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account. Please try again or send feedback.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-500">Loading account...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Account Settings</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Last Man Standing</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Profile Card */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">Your Profile</h2>
          <div className="text-sm">
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Email</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{user?.email}</p>
          </div>
          <div className="text-sm">
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Account ID</p>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">{user?.id}</p>
          </div>
        </section>

        {/* Notifications / Reminders Card */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">Push Notifications</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Receive deadline alerts before Premier League matchday kickoffs so you never miss a pick.
          </p>

          <div className="pt-2">
            {notificationStatus === 'granted' ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <span>✓</span> Notifications Enabled
              </div>
            ) : notificationStatus === 'denied' ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Notifications blocked in your browser. Enable them in your device/browser settings.
              </p>
            ) : (
              <button
                onClick={handleEnableNotifications}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm"
              >
                Enable Pick Reminders
              </button>
            )}
          </div>
        </section>

        {/* Privacy & Legal */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">Legal & Privacy</h2>
          <div className="space-y-2 text-sm">
            <p>
              <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Use &rarr;
              </Link>
            </p>
            <p>
              <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy &rarr;
              </Link>
            </p>
            <p>
              <Link href="/help" className="text-blue-600 dark:text-blue-400 hover:underline">
                Game Rules & Help &rarr;
              </Link>
            </p>
          </div>
        </section>

        {/* App Store Compliance: Delete Account Card */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-rose-600 dark:text-rose-400">Danger Zone</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Permanently delete your login, your picks, and your place in every league. A league you created stays open if other people are still in it. This cannot be undone.
          </p>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-sm font-semibold transition"
            >
              Delete My Account
            </button>
          ) : (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                Are you absolutely sure? Type <span className="font-mono bg-rose-200/60 dark:bg-rose-900/60 px-1 py-0.5 rounded">DELETE</span> to confirm.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 text-sm border border-rose-300 dark:border-rose-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false)
                    setConfirmText('')
                    setError('')
                  }}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
