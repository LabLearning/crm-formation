import type { Metadata } from 'next'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'
import { Cursor } from './Cursor'

export const metadata: Metadata = {
  title: 'Lab Learning — Formations certifiées Qualiopi',
  description: 'Organisme de formation professionnelle des métiers de bouche : restauration, boucherie, boulangerie, pâtisserie, hôtellerie. Certifié Qualiopi.',
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#14110F] antialiased selection:bg-[#195144] selection:text-white">
      <Cursor />
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
