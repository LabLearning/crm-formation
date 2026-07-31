'use client'

import { useEffect, useRef } from 'react'

/**
 * Curseur custom discret : un point + un anneau qui suit avec une légère
 * inertie, l'anneau grossit au survol des éléments interactifs.
 * Desktop / pointeur fin uniquement (CSS masque le reste + reduced-motion).
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let rx = -100, ry = -100, tx = -100, ty = -100, raf = 0
    const onMove = (e: MouseEvent) => {
      tx = e.clientX; ty = e.clientY
      if (dot.current) dot.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`
      const t = e.target as HTMLElement | null
      const interactive = !!t?.closest('a, button, [role="button"], input, textarea, select, label')
      ring.current?.classList.toggle('is-active', interactive)
    }
    const loop = () => {
      rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  return (
    <>
      <div ref={ring} className="ll-cursor ll-cursor-ring" aria-hidden="true" />
      <div ref={dot} className="ll-cursor ll-cursor-dot" aria-hidden="true" />
    </>
  )
}
