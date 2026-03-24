'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, GraduationCap, FileText, ClipboardCheck,
  Calendar, ListChecks, Star, Menu, X,
  Users, CheckSquare, Receipt, FileSignature, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import type { PortalContext } from '@/lib/portal-auth'

interface PortalShellProps { context: PortalContext; children: React.ReactNode }

const apprenantNav = [
  { label: 'Accueil', href: '', icon: LayoutDashboard },
  { label: 'Mes formations', href: '/formations', icon: GraduationCap },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Evaluations', href: '/evaluations', icon: ClipboardCheck },
  { label: 'Questionnaires', href: '/questionnaires', icon: ListChecks },
]
const formateurNav = [
  { label: 'Accueil', href: '', icon: LayoutDashboard },
  { label: 'Mes sessions', href: '/sessions', icon: Calendar },
  { label: 'Apprenants', href: '/apprenants', icon: Users },
  { label: 'Emargement', href: '/emargement', icon: CheckSquare },
  { label: 'Evaluations', href: '/evaluations', icon: Star },
  { label: 'Documents', href: '/documents', icon: FileText },
]
const clientNav = [
  { label: 'Accueil', href: '', icon: LayoutDashboard },
  { label: 'Formations', href: '/formations-client', icon: GraduationCap },
  { label: 'Conventions', href: '/conventions-client', icon: FileSignature },
  { label: 'Factures', href: '/factures-client', icon: Receipt },
  { label: 'Documents', href: '/documents', icon: FileText },
]
const apporteurNav = [
  { label: 'Accueil', href: '', icon: LayoutDashboard },
  { label: 'Mes leads', href: '/leads-apporteur', icon: Users },
  { label: 'Commissions', href: '/commissions-apporteur', icon: Receipt },
]
const partenaireNav = [
  { label: 'Tableau de bord', href: '', icon: LayoutDashboard },
  { label: 'Dossiers', href: '/dossiers-partenaire', icon: FileSignature },
  { label: 'Sessions', href: '/sessions-partenaire', icon: Calendar },
  { label: 'Leads', href: '/leads-apporteur', icon: Users },
  { label: 'Commissions', href: '/commissions-apporteur', icon: Receipt },
]

function isPartenaire(ctx: PortalContext) {
  return ctx.type === 'apporteur' && ctx.apporteur.categorie === 'partenaire'
}

function getDisplayInfo(ctx: PortalContext) {
  if (ctx.type === 'apprenant') return { name: ctx.apprenant.prenom + ' ' + ctx.apprenant.nom, firstName: ctx.apprenant.prenom, lastName: ctx.apprenant.nom, subtitle: 'Espace apprenant' }
  if (ctx.type === 'formateur') return { name: ctx.formateur.prenom + ' ' + ctx.formateur.nom, firstName: ctx.formateur.prenom, lastName: ctx.formateur.nom, subtitle: 'Espace formateur' }
  if (ctx.type === 'client') {
    const c = ctx.contact
    return { name: c ? c.prenom + ' ' + c.nom : (ctx.client.raison_sociale || 'Client'), firstName: c?.prenom || ctx.client.raison_sociale?.charAt(0) || 'C', lastName: c?.nom || '', subtitle: 'Espace client' }
  }
  if (ctx.type === 'apporteur') {
    const isP = ctx.apporteur.categorie === 'partenaire'
    const label = isP ? ('Espace partenaire' + (ctx.apporteur.nom_enseigne ? ' - ' + ctx.apporteur.nom_enseigne : '')) : 'Espace apporteur'
    return { name: (ctx.apporteur.prenom || '') + ' ' + ctx.apporteur.nom, firstName: ctx.apporteur.prenom || ctx.apporteur.nom.charAt(0), lastName: ctx.apporteur.nom, subtitle: label }
  }
  return { name: '', firstName: '', lastName: '', subtitle: '' }
}

export function PortalShell({ context, children }: PortalShellProps) {
  const pathname = usePathname()
  const [mobileNav, setMobileNav] = useState(false)
  const basePath = '/portail/' + context.token
  const nav = context.type === 'apprenant' ? apprenantNav : context.type === 'formateur' ? formateurNav : context.type === 'apporteur' ? (isPartenaire(context) ? partenaireNav : apporteurNav) : clientNav
  const info = getDisplayInfo(context)

  function isActive(href: string) {
    const full = basePath + href
    if (href === '') return pathname === basePath || pathname === basePath + '/'
    return pathname.startsWith(full)
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-30 bg-white border-b border-surface-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNav(!mobileNav)} className="lg:hidden p-2 rounded-xl text-surface-500 hover:bg-surface-100">
              {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-white">{context.organization.name.charAt(0)}</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-heading font-bold text-surface-900">{context.organization.name}</div>
              <div className="text-[10px] text-surface-400">{info.subtitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-surface-800">{info.name}</div>
              <div className="text-[10px] text-surface-500 capitalize">{context.type}</div>
            </div>
            <Avatar firstName={info.firstName} lastName={info.lastName} size="sm" />
          </div>
        </div>
        <div className="hidden lg:block border-t border-surface-100">
          <div className="max-w-6xl mx-auto px-6">
            <nav className="flex gap-1 -mb-px">
              {nav.map(item => (
                <Link key={item.href} href={basePath + item.href}
                  className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive(item.href) ? 'border-brand-600 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300')}>
                  <item.icon className="h-4 w-4" />{item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      {mobileNav && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-surface-900/40" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-16 bottom-0 w-64 bg-white shadow-modal p-4">
            <nav className="space-y-1">
              {nav.map(item => (
                <Link key={item.href} href={basePath + item.href} onClick={() => setMobileNav(false)}
                  className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                    isActive(item.href) ? 'bg-brand-50 text-brand-700 font-medium' : 'text-surface-600 hover:bg-surface-50')}>
                  <item.icon className={cn('h-[18px] w-[18px]', isActive(item.href) ? 'text-brand-600' : 'text-surface-400')} />{item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-8">{children}</main>
    </div>
  )
}
