'use client'

import { useEffect, useRef, useState } from 'react'

type ThreeDBadgeProps = {
  size?: 'sm' | 'md' | 'lg'
}

export default function ThreeDBadge({ size = 'md' }: ThreeDBadgeProps) {
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [rotation, setRotation] = useState({ x: -6, y: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const last = useRef({ x: 0, y: 0 })
  const frame = useRef<number | null>(null)
  const pausedRef = useRef(paused)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const tick = () => {
      if (!dragging && !pausedRef.current) {
        setRotation(r => {
          const nextY = r.y + 0.55 * speed + velocity.current.y
          velocity.current.y *= 0.94
          velocity.current.x *= 0.94
          return {
            x: Math.max(-22, Math.min(22, r.x + velocity.current.x)),
            y: nextY
          }
        })
      }
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [dragging, speed])

  const startDrag = (clientX: number, clientY: number) => {
    setDragging(true)
    last.current = { x: clientX, y: clientY }
    velocity.current = { x: 0, y: 0 }
  }

  const drag = (clientX: number, clientY: number) => {
    if (!dragging) return
    const dx = clientX - last.current.x
    const dy = clientY - last.current.y
    setRotation(r => ({
      x: Math.max(-28, Math.min(28, r.x + dy * 0.45)),
      y: r.y + dx * 0.7
    }))
    velocity.current = { x: dy * 0.08, y: dx * 0.12 }
    last.current = { x: clientX, y: clientY }
  }

  const stopDrag = () => setDragging(false)

  const heights = { sm: 'h-56', md: 'h-72', lg: 'h-96' }

  return (
    <section className="relative w-full overflow-hidden rounded-3xl border border-slate-700/60 bg-[radial-gradient(circle_at_50%_35%,#203b5d_0%,#0b1424_52%,#040812_100%)] shadow-2xl">
      <div
        className={`relative flex w-full ${heights[size]} select-none items-center justify-center overflow-hidden touch-none`}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          startDrag(e.clientX, e.clientY)
        }}
        onPointerMove={e => drag(e.clientX, e.clientY)}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={e => {
          if (e.buttons === 0) stopDrag()
        }}
      >
        <div
          aria-label="Spinning Last Man Standing badge"
          className="relative aspect-square w-[min(70vw,280px)] [transform-style:preserve-3d]"
          style={{
            transform: `perspective(900px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: dragging ? 'none' : 'transform 80ms linear',
          }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200 via-amber-500 to-yellow-800 shadow-[0_18px_45px_rgba(0,0,0,0.55)] [transform:translateZ(-18px)]" />
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-yellow-200/80 bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-800 shadow-[inset_0_0_8px_rgba(255,255,255,.25)]"
              style={{ transform: `translateZ(${-16 + i * 3}px)` }}
            />
          ))}
          <div
            className="absolute inset-[6px] rounded-full bg-slate-950 p-[4px] shadow-[inset_0_0_0_2px_rgba(255,220,120,.8),inset_0_0_28px_rgba(0,0,0,.8)]"
            style={{ transform: 'translateZ(4px)' }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-full bg-white">
              <img
                src="/last-man-standing-badge.svg"
                alt="Last Man Standing"
                className="h-full w-full object-contain"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(115deg,rgba(255,255,255,.55),transparent_28%,transparent_68%,rgba(255,255,255,.18))]" />
            </div>
          </div>
          <div
            className="absolute inset-[3px] rounded-full border-2 border-yellow-100/80 shadow-[0_0_14px_rgba(255,215,100,.75)]"
            style={{ transform: 'translateZ(7px)' }}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950/75 px-2 py-1.5 shadow-lg backdrop-blur">
        <button type="button" onClick={() => setPaused(false)} className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white">
          SPIN
        </button>
        <button type="button" onClick={() => setPaused(true)} className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold text-white">
          PAUSE
        </button>
        <input
          aria-label="Badge rotation speed"
          type="range"
          min="0.25"
          max="2.5"
          step="0.05"
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="w-20 accent-amber-400"
        />
      </div>
    </section>
  )
}
