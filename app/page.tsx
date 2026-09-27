'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeCount, setActiveCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (!user) {
        router.push('/login')
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('competition_players')
        .select(`
          id,
          competitions!competition_players_competition_id_fkey ( status )
        `)
        .eq('user_id', user.id)

      const active = (data || []).filter((row: any) =>
        ['open', 'active'].includes(row.competitions?.status)
      )
      setActiveCount(active.length)
      setLoading(false)
    }
    init()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/last-man-standing-crest.jpg"
              alt=""
              width={52}
              height={52}
              className="h-10 w-10 shrink-0 rounded-xl border border-amber-200 bg-white object-cover shadow-sm sm:h-12 sm:w-12"
            />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                Last Man Standing
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Premier League 2026/27
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-sm text-slate-500 dark:text-slate-400">Signed in as</p>
          <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
            {user?.email}
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/join"
            className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-4 rounded-xl font-semibold shadow-sm transition"
          >
            Join League
          </Link>

          <Link
            href="/create"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-4 px-4 rounded-xl font-semibold shadow-sm transition"
          >
            Create League
          </Link>

          <Link
            href="/competitions"
            className="block w-full text-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-4 px-4 rounded-xl font-semibold border border-slate-200 dark:border-slate-600 shadow-sm transition"
          >
            My Leagues
            {activeCount > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                ({activeCount} active)
              </span>
            )}
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-10">
          Open a league to pick teams, view players, fixtures and results.
        </p>
      </main>
    </div>
  )
}
