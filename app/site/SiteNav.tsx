'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X, ArrowRight } from './icons'

const LINKS = [
  { href: '/site', label: 'Accueil' },
  { href: '/site/formations', label: 'Nos formations' },
  { href: '/site/financements', label: 'Financements' },
  { href: '/site/partenaires', label: 'Partenaires' },
  { href: '/site/a-propos', label: 'À propos' },
  { href: '/site/contact', label: 'Contact' },
]

export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isActive = (h: string) => (h === '/site' ? pathname === '/site' : pathname.startsWith(h))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-xl border-b border-black/[0.06] shadow-[0_1px_20px_-8px_rgba(0,0,0,0.15)]'
        : 'bg-white/60 backdrop-blur-md border-b border-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-6">
        <Link href="/site" className="flex items-center shrink-0">
          <img src="/logo-lablearning.svg" alt="Lab Learning" className="h-7 w-auto" />
        </Link>

        {/* Liens desktop — soulignement animé */}
        <nav className="hidden lg:flex items-center gap-7">
          {LINKS.map((l) => {
            const active = isActive(l.href)
            return (
              <Link key={l.href} href={l.href}
                className={`group relative py-1.5 text-sm font-medium transition-colors ${active ? 'text-[#14110F]' : 'text-[#57534E] hover:text-[#14110F]'}`}>
                {l.label}
                <span className={`absolute left-0 -bottom-0.5 h-[2px] rounded-full bg-[#195144] transition-all duration-300 ease-out ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/site/contact"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#195144] text-white text-sm font-semibold pl-4 pr-3 py-2 hover:bg-[#123f34] ll-lift">
            Nous contacter
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20"><ArrowRight className="h-3 w-3" /></span>
          </Link>
          <button className="lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-black/[0.04] text-[#14110F]"
            onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="lg:hidden border-t border-black/[0.06] bg-white/95 backdrop-blur-xl">
          <nav className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-medium transition-colors ${
                  isActive(l.href) ? 'bg-[#195144]/8 text-[#195144]' : 'text-[#44403C] hover:bg-black/[0.03]'
                }`}>
                {l.label}
                <ArrowRight className={`h-4 w-4 ${isActive(l.href) ? 'opacity-100' : 'opacity-30'}`} />
              </Link>
            ))}
            <Link href="/site/contact" onClick={() => setOpen(false)}
              className="mt-1 mb-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#195144] text-white text-sm font-semibold hover:bg-[#123f34]">
              Nous contacter <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
