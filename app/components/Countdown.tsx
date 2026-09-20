'use client'

import { useEffect, useState } from 'react'

export default function Countdown({ deadline }: { deadline: Date | null }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!deadline) {
      setLabel('')
      return
    }

    const tick = () => {
      const ms = deadline.getTime() - Date.now()
      if (ms <= 0) {
        setLabel('Picks locked')
        return
      }
      const totalSec = Math.floor(ms / 1000)
      const d = Math.floor(totalSec / 86400)
      const h = Math.floor((totalSec % 86400) / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      if (d > 0) setLabel(`${d}d ${h}h ${m}m`)
      else if (h > 0) setLabel(`${h}h ${m}m ${s}s`)
      else setLabel(`${m}m ${s}s`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (!deadline || !label) return null

  const urgent = deadline.getTime() - Date.now() < 60 * 60 * 1000

  return (
    <span
      className={
        urgent
          ? 'text-red-600 dark:text-red-400 font-semibold'
          : 'text-slate-600 dark:text-slate-300 font-medium'
      }
    >
      {label === 'Picks locked' ? label : `Locks in ${label}`}
    </span>
  )
}
