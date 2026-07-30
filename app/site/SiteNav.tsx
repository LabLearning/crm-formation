'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from './icons'

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
  const isActive = (h: string) => h === '/site' ? pathname === '/site' : pathname.startsWith(h)

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#195144]/10">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link href="/site" className="flex items-center gap-2.5 group">
          <img src="/logo-lablearning.svg" alt="Lab Learning" className="h-8 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(l.href) ? 'text-[#195144]' : 'text-[#57534E] hover:text-[#14110F]'}`}>
              {l.label}
            </Link>
          ))}
          <Link href="/site/contact" className="ml-2 inline-flex items-center px-4 py-2 rounded-full bg-[#195144] text-white text-sm font-semibold hover:bg-[#123f34] transition-colors">
            Nous contacter
          </Link>
        </nav>

        <button className="lg:hidden p-2 -mr-2 text-[#14110F]" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[#195144]/10 bg-white">
          <nav className="max-w-6xl mx-auto px-5 py-3 flex flex-col">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={`py-2.5 text-sm font-medium ${isActive(l.href) ? 'text-[#195144]' : 'text-[#57534E]'}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
