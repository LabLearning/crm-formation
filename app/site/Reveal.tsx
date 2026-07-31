'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Révèle son contenu (fade + translation) quand il entre dans le viewport.
 * Respecte prefers-reduced-motion. `delay` échelonne les apparitions.
 */
export function Reveal({
  children, className = '', delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(true); return }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`ll-reveal ${shown ? 'll-reveal-in' : ''} ${className}`}>
      {children}
    </div>
  )
}
