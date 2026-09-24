'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadCompetitions()
  }, [])

  const loadCompetitions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data, error } = await supabase
        .from('competition_players')
        .select(`
          id,
          status,
          display_name,
          eliminated_gameweek,
          competitions!competition_players_competition_id_fkey (
            id,
            name,
            join_code,
            current_gameweek,
            status,
            created_by
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error
      setCompetitions(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async (competitionId: string, competitionName: string) => {
    const confirmed = window.confirm(
      `Archive "${competitionName}"?\n\n` +
        `• League moves to History\n` +
        `• All picks and eliminations are kept\n` +
        `• Players can still open and view it\n` +
        `• You can permanently delete it later from History`
    )
    if (!confirmed) return

    setArchivingId(competitionId)
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', competitionId)
      if (error) throw error
      await loadCompetitions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setArchivingId(null)
    }
  }

  const handleDelete = async (competitionId: string, competitionName: string) => {
    const confirmed = window.confirm(
      `Permanently delete "${competitionName}"?\n\n` +
        `This CANNOT be undone.\n` +
        `All players, picks and history will be removed.\n\n` +
        `Prefer Archive if you only want it off the Active list.`
    )
    if (!confirmed) return

    setDeletingId(competitionId)
    try {
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('id', competitionId)
      if (error) throw error
      await loadCompetitions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const active = competitions.filter(
    (i) => i.competitions && ['open', 'active'].includes(i.competitions.status)
  )
  const finished = competitions.filter(
    (i) =>
      i.competitions && ['finished', 'archived'].includes(i.competitions.status)
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  const card = (item: any, showArchive: boolean) => {
    const comp = item.competitions
    if (!comp) return null
    const isCreator = comp.created_by === userId
    const showDelete = isCreator && !showArchive

    return (
      <div
        key={item.id}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5"
      >
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {comp.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Code:{' '}
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                {comp.join_code}
              </span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              GW {comp.current_gameweek}
              {' · '}
              <span
                className={
                  item.status === 'alive'
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-red-600 dark:text-red-400 font-medium'
                }
              >
                {item.status === 'alive'
                  ? 'Alive'
                  : `Out${item.eliminated_gameweek ? ` GW${item.eliminated_gameweek}` : ''}`}
              </span>
              {' · '}
              <span className="capitalize">{comp.status}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 items-end shrink-0">
            <Link
              href={`/league/${comp.id}`}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg"
            >
              Open
            </Link>
            {showArchive && isCreator && (
              <button
                type="button"
                onClick={() => handleArchive(comp.id, comp.name)}
                disabled={archivingId === comp.id}
                title="Keeps history; moves to History list"
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50"
              >
                {archivingId === comp.id ? 'Archiving...' : 'Archive (keep history)'}
              </button>
            )}
            {showDelete && (
              <button
                type="button"
                onClick={() => handleDelete(comp.id, comp.name)}
                disabled={deletingId === comp.id}
                title="Permanently removes all data"
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {deletingId === comp.id ? 'Deleting...' : 'Delete forever'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Leagues</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Open a league to play and view history
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <Link
              href="/"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Active
          </h2>
          {active.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-sm text-slate-600 dark:text-slate-300">
              No active leagues.{' '}
              <Link href="/create" className="text-blue-600 dark:text-blue-400 underline">
                Create one
              </Link>{' '}
              or{' '}
              <Link href="/join" className="text-blue-600 dark:text-blue-400 underline">
                join with a code
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-3">{active.map((i) => card(i, true))}</div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            History
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Finished and archived leagues. Archive keeps picks; Delete forever removes everything.
          </p>
          {finished.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-sm text-slate-600 dark:text-slate-300">
              Finished and archived leagues will appear here.
            </div>
          ) : (
            <div className="space-y-3">{finished.map((i) => card(i, false))}</div>
          )}
        </section>
      </main>
    </div>
  )
}
