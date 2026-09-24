'use client'

import { useEffect, useRef, useState } from 'react'

type ThreeDBadgeProps = {
  size?: 'sm' | 'md' | 'lg'
}

export default function ThreeDBadge({ size = 'md' }: ThreeDBadgeProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const [speed, setSpeed] = useState(0.8)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    let cleanup = () => {}
    let cancelled = false

    const start = async () => {
      if (!mountRef.current) return

      const scriptId = 'lms-three-r128'
      let script = document.getElementById(scriptId) as HTMLScriptElement | null

      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
        script.async = true
        document.head.appendChild(script)
        await new Promise<void>((resolve, reject) => {
          script!.addEventListener('load', () => resolve(), { once: true })
          script!.addEventListener('error', () => reject(new Error('Three.js failed to load')), { once: true })
        })
      } else if (!(window as any).THREE) {
        await new Promise<void>((resolve) => script!.addEventListener('load', () => resolve(), { once: true }))
      }

      if (cancelled || !mountRef.current) return

      const THREE = (window as any).THREE
      const host = mountRef.current
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
      camera.position.set(0, 0.05, 8.6)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputEncoding = THREE.sRGBEncoding
      host.appendChild(renderer.domElement)

      const resize = () => {
        const w = Math.max(host.clientWidth, 1)
        const h = Math.max(host.clientHeight, 1)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h, false)
      }
      resize()

      scene.add(new THREE.HemisphereLight(0xffffff, 0x17233a, 1.35))

      const key = new THREE.DirectionalLight(0xffffff, 2.1)
      key.position.set(4, 5, 7)
      scene.add(key)

      const warm = new THREE.PointLight(0xffc451, 2.4, 18)
      warm.position.set(-4, 2, 5)
      scene.add(warm)

      const blue = new THREE.PointLight(0x4c8cff, 1.6, 16)
      blue.position.set(4, -2, -4)
      scene.add(blue)

      const badge = new THREE.Group()
      scene.add(badge)

      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(3.0, 3.0, 0.48, 96),
        new THREE.MeshStandardMaterial({ color: 0xc99522, metalness: 0.95, roughness: 0.18 })
      )
      coin.rotation.x = Math.PI / 2
      badge.add(coin)

      const loader = new THREE.TextureLoader()
      const texture = loader.load('/last-man-standing-badge.svg')
      texture.encoding = THREE.sRGBEncoding
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

      const front = new THREE.Mesh(
        new THREE.CircleGeometry(2.94, 96),
        new THREE.MeshStandardMaterial({ map: texture, transparent: true, metalness: 0.12, roughness: 0.34 })
      )
      front.position.z = 0.25
      badge.add(front)

      const back = new THREE.Mesh(
        new THREE.CircleGeometry(2.94, 96),
        new THREE.MeshStandardMaterial({ map: texture, transparent: true, side: THREE.BackSide, metalness: 0.1, roughness: 0.4 })
      )
      back.position.z = -0.25
      back.rotation.y = Math.PI
      badge.add(back)

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(3.0, 0.055, 16, 128),
        new THREE.MeshStandardMaterial({ color: 0xffd25c, metalness: 1, roughness: 0.13 })
      )
      rim.position.z = 0.27
      badge.add(rim)

      let dragging = false
      let lastX = 0
      let lastY = 0
      let velocityY = 0.012
      let velocityX = 0
      let raf = 0

      const down = (e: PointerEvent) => {
        dragging = true
        lastX = e.clientX
        lastY = e.clientY
        velocityY = 0
        velocityX = 0
        renderer.domElement.setPointerCapture?.(e.pointerId)
      }
      const move = (e: PointerEvent) => {
        if (!dragging) return
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        badge.rotation.y += dx * 0.012
        badge.rotation.x += dy * 0.006
        velocityY = dx * 0.0012
        velocityX = dy * 0.0007
        lastX = e.clientX
        lastY = e.clientY
      }
      const up = () => { dragging = false }

      renderer.domElement.addEventListener('pointerdown', down)
      renderer.domElement.addEventListener('pointermove', move)
      renderer.domElement.addEventListener('pointerup', up)
      renderer.domElement.addEventListener('pointercancel', up)

      const animate = () => {
        raf = requestAnimationFrame(animate)
        if (!dragging) {
          if (!pausedRef.current) {
            const target = 0.010 * speed
            velocityY += (target - velocityY) * 0.035
          } else {
            velocityY *= 0.90
            velocityX *= 0.90
          }
          badge.rotation.y += velocityY * 60 / 60
          badge.rotation.x += velocityX * 60 / 60
          velocityY *= 0.985
          velocityX *= 0.985
        }
        badge.position.y = Math.sin(performance.now() * 0.0012) * 0.035
        renderer.render(scene, camera)
      }
      animate()

      const observer = new ResizeObserver(resize)
      observer.observe(host)

      cleanup = () => {
        cancelled = true
        cancelAnimationFrame(raf)
        observer.disconnect()
        renderer.domElement.removeEventListener('pointerdown', down)
        renderer.domElement.removeEventListener('pointermove', move)
        renderer.domElement.removeEventListener('pointerup', up)
        renderer.domElement.removeEventListener('pointercancel', up)
        renderer.dispose()
        host.innerHTML = ''
      }
    }

    start().catch(() => {})
    return () => { cancelled = true; cleanup() }
  }, [speed])

  const heights = { sm: 'h-56', md: 'h-72', lg: 'h-96' }

  return (
    <section className="relative w-full overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-700/70 bg-[radial-gradient(circle_at_50%_42%,#182b43_0%,#0b1220_55%,#050914_100%)] shadow-xl">
      <div ref={mountRef} className={`w-full ${heights[size]}`} />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-slate-950/70 px-2 py-1.5 backdrop-blur">
        <button type="button" onClick={() => setPaused(false)} className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold text-white">SPIN</button>
        <button type="button" onClick={() => setPaused(true)} className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold text-white">PAUSE</button>
        <input aria-label="Badge rotation speed" type="range" min="0.15" max="2.5" step="0.05" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-20 accent-amber-400" />
      </div>
    </section>
  )
}
