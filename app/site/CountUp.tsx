'use client'

import { useEffect, useRef, useState } from 'react'

/** Compteur qui s'incrémente quand il entre dans le viewport. Respecte prefers-reduced-motion. */
export function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(value); return }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !done.current) {
          done.current = true
          const start = performance.now()
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / duration)
            const eased = 1 - Math.pow(1 - p, 3)
            setN(Math.round(value * eased))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  return <span ref={ref} className="tabular-nums">{n.toLocaleString('fr-FR')}</span>
}
