"use client"

import { useMemo } from 'react'

type Player = {
  id: string
  display_name?: string
  status?: string
}

type PickRow = {
  player_id: string
  gameweek: number
  team_name: string
  cycle_number?: number
}

export default function LeagueCycleHistory({
  players,
  picks,
  cycleNumber,
  winnerPlayerId = null,
}: {
  players: Player[]
  picks: PickRow[]
  cycleNumber: number
  winnerPlayerId?: string | null
}) {
  const cyclePicks = useMemo(
    () =>
      (picks || []).filter(
        (pick) => Number(pick.cycle_number ?? 1) === Number(cycleNumber ?? 1)
      ),
    [picks, cycleNumber]
  )

  const gameweeks = useMemo(() => {
    const values = cyclePicks.map((pick) => pick.gameweek)
    return Array.from(new Set(values)).sort((a, b) => a - b)
  }, [cyclePicks])

  const playerMatrix = useMemo(() => {
    const map = new Map<string, Record<number, string>>()

    for (const pick of cyclePicks) {
      const row = map.get(pick.player_id) ?? {}
      row[pick.gameweek] = pick.team_name
      map.set(pick.player_id, row)
    }

    return map
  }, [cyclePicks])

  const alive = players.filter((p) => p.status === 'alive').length
  const out = players.filter((p) => p.status === 'eliminated').length
  const winner = winnerPlayerId
    ? players.find((p) => p.id === winnerPlayerId)
    : null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Cycle history
          </p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Cycle {cycleNumber}
          </h2>
          {winner && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 font-medium">
              Winner: {winner.display_name || 'Player'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 text-center">
            <div className="text-slate-500 dark:text-slate-400">Alive</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-300">{alive}</div>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-2 py-1 text-center">
            <div className="text-slate-500 dark:text-slate-400">Out</div>
            <div className="font-bold text-red-700 dark:text-red-300">{out}</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Player</th>
              {gameweeks.map((gw) => (
                <th key={gw} className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                  GW{gw}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {players.map((player) => {
              const row = playerMatrix.get(player.id) ?? {}
              const isWinner = winnerPlayerId === player.id

              return (
                <tr key={player.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                    {player.display_name || 'Player'}
                    {isWinner && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-400 text-amber-950">
                        Winner
                      </span>
                    )}
                  </td>

                  {gameweeks.map((gw) => (
                    <td key={`${player.id}-${gw}`} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {row[gw] ?? '-'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
