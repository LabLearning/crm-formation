'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '/site', label: 'Accueil' },
  { href: '/site/formations', label: 'Nos formations' },
  { href: '/site/equipe', label: 'Notre équipe' },
  { href: '/site/contact', label: 'Contact' },
]

export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isActive = (h: string) => h === '/site' ? pathname === '/site' : pathname.startsWith(h)

  return (
    <header className="sticky top-0 z-50 bg-[#F6F4EF]/85 backdrop-blur-md border-b border-[#195144]/10">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link href="/site" className="flex items-center gap-2.5 group">
          <span className="h-8 w-8 rounded-xl bg-[#195144] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/></svg>
          </span>
          <span className="font-heading font-bold tracking-heading text-[#14110F] text-[15px]">Lab Learning</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(l.href) ? 'text-[#195144]' : 'text-[#57534E] hover:text-[#14110F]'}`}>
              {l.label}
            </Link>
          ))}
          <Link href="/site/contact" className="ml-2 inline-flex items-center px-4 py-2 rounded-full bg-[#195144] text-white text-sm font-semibold hover:bg-[#123f34] transition-colors">
            Nous contacter
          </Link>
        </nav>

        <button className="md:hidden p-2 -mr-2 text-[#14110F]" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#195144]/10 bg-[#F6F4EF]">
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
