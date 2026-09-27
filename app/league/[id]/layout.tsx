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
    <div className="league-app-shell min-h-screen">
      <LeagueNav
        leagueId={leagueId}
        name={meta?.name}
        gameweek={meta?.current_gameweek}
        status={meta?.status}
      />
      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
        {children}
      </main>
    </div>
  )
}
