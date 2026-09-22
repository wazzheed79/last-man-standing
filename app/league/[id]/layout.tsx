'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import LeagueNav from '@/components/LeagueNav'

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const leagueId = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const [meta, setMeta] = useState<{
    name: string
    current_gameweek: number
    status: string
  } | null>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('competitions')
        .select('name, current_gameweek, status')
        .eq('id', leagueId)
        .single()

      if (data) setMeta(data)
    }
    load()
  }, [leagueId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <LeagueNav
        leagueId={leagueId}
        name={meta?.name}
        gameweek={meta?.current_gameweek}
        status={meta?.status}
      />
      <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
