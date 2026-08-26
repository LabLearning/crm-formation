'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, GraduationCap, FileText, ClipboardCheck, Calendar,
  ListChecks, Star, Users, CheckSquare, Receipt, UserPlus, Building2,
  LogOut, ChevronDown, Menu, X, BookOpen, MoreHorizontal, ReceiptEuro, Route,
} from '@/components/ui/icons'
import { Avatar } from '@/components/ui'
import { ToastProvider } from '@/components/ui/Toast'
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { StudioWidget } from '@/components/formateur/StudioWidget'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

interface NavItem { label: string; short: string; href: string; icon: React.ElementType }

const apprenantNav: NavItem[] = [
  { label: 'Accueil', short: 'Accueil', href: '', icon: LayoutDashboard },
  { label: 'Mes formations', short: 'Formations', href: '/formations', icon: GraduationCap },
  { label: 'Documents', short: 'Docs', href: '/documents', icon: FileText },
  { label: 'Évaluations', short: 'Évals', href: '/evaluations', icon: ClipboardCheck },
  { label: 'Questionnaires', short: 'QCM', href: '/questionnaires', icon: ListChecks },
]

const formateurNav: NavItem[] = [
  { label: 'Accueil', short: 'Accueil', href: '', icon: LayoutDashboard },
  { label: 'Mes sessions', short: 'Sessions', href: '/sessions', icon: Calendar },
  { label: 'Déroulé opérationnel', short: 'Déroulé', href: '/deroule', icon: Route },
  { label: 'Apprenants', short: 'Apprenants', href: '/apprenants', icon: Users },
  { label: 'Émargement', short: 'Émarg.', href: '/emargement', icon: CheckSquare },
  { label: 'Contenu pédagogique', short: 'Contenu', href: '/contenu', icon: BookOpen },
  { label: 'Questionnaires', short: 'QCM', href: '/qcm', icon: ListChecks },
  { label: 'Evaluations', short: 'Évals', href: '/evaluations', icon: Star },
  { label: 'Documents', short: 'Docs', href: '/documents', icon: FileText },
  { label: 'Facturation', short: 'Factures', href: '/facturation', icon: ReceiptEuro },
]

const apporteurNav: NavItem[] = [
  { label: 'Accueil', short: 'Accueil', href: '', icon: LayoutDashboard },
  { label: 'Mes leads', short: 'Leads', href: '/leads', icon: UserPlus },
  { label: 'Commissions', short: 'Commissions', href: '/commissions', icon: ReceiptEuro },
  { label: 'Mes clients', short: 'Clients', href: '/clients', icon: Building2 },
]

const PORTAL_GREEN = '#205040'

function getDisplayInfo(user: User) {
  const roleLabels: Record<string, string> = {
    apprenant: 'Espace apprenant',
    formateur: 'Espace formateur',
    apporteur_affaires: "Espace apporteur d'affaires",
  }
  return {
    name: `${user.first_name} ${user.last_name}`.trim(),
    firstName: user.first_name || 'U',
    lastName: user.last_name || '',
    subtitle: roleLabels[user.role] || 'Mon espace',
  }
}

export function MonEspaceShell({ user, orgName, children, impersonatedBy }: { user: User; orgName: string; children: React.ReactNode; impersonatedBy?: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const basePath = '/mon-espace'
  const info = getDisplayInfo(user)

  const nav = user.role === 'apprenant' ? apprenantNav
            : user.role === 'formateur' ? formateurNav
            : apporteurNav

  // Barre mobile : au-delà de 5 entrées, 4 items principaux + bouton « Plus »
  // qui ouvre une feuille avec toutes les entrées (plutôt qu'une grille tassée).
  const MOBILE_PRIMARY = 4
  const hasOverflow = nav.length > 5
  const primaryNav = hasOverflow ? nav.slice(0, MOBILE_PRIMARY) : nav
  const mobileCols = primaryNav.length + (hasOverflow ? 1 : 0)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function isActive(href: string) {
    const full = basePath + href
    if (href === '') return pathname === basePath || pathname === basePath + '/'
    return pathname.startsWith(full)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <ToastProvider>
    <div className={cn('min-h-screen bg-surface-50', impersonatedBy && 'pt-10')}>
      {impersonatedBy && <ImpersonationBanner user={user} />}
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-surface-200/60">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo-lablearning.svg" alt="Lab Learning" className="h-7 shrink-0" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2">
                <Avatar firstName={info.firstName} lastName={info.lastName} size="sm" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-surface-200 shadow-elevated py-1 animate-in-scale origin-top-right z-50">
                  <div className="px-3.5 py-2.5 border-b border-surface-100">
                    <div className="text-sm font-medium text-surface-900 truncate">{info.name}</div>
                    <div className="text-xs text-surface-400 truncate">{user.email}</div>
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-danger-600 hover:bg-danger-50">
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden md:block sticky top-0 z-30 bg-white border-b border-surface-200/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-lablearning.svg" alt="Lab Learning" className="h-9 shrink-0" />
            <div>
              <div className="text-[10px] text-surface-400">{info.subtitle}</div>
            </div>
          </div>
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-surface-50 transition-colors">
              <div className="text-right">
                <div className="text-sm font-medium text-surface-800 leading-none">{info.name}</div>
                <div className="text-[11px] text-surface-400 mt-0.5">{info.subtitle}</div>
              </div>
              <Avatar firstName={info.firstName} lastName={info.lastName} size="sm" />
              <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-surface-200 shadow-elevated py-1 animate-in-scale origin-top-right z-50">
                <div className="px-3.5 py-2.5 border-b border-surface-100">
                  <div className="text-sm font-medium text-surface-900 truncate">{info.name}</div>
                  <div className="text-xs text-surface-400 truncate">{user.email}</div>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-danger-600 hover:bg-danger-50">
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop tab nav */}
        <div className="border-t border-surface-100">
          <div className="max-w-6xl mx-auto px-6">
            <nav className="flex items-center gap-1 -mb-px overflow-x-auto min-w-0">
              {nav.map((item) => {
                return (
                  <Link key={item.href} href={basePath + item.href}
                    className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                      isActive(item.href)
                        ? 'border-b-2 text-[#205040]'
                        : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
                    )}
                    style={isActive(item.href) ? { borderBottomColor: PORTAL_GREEN } : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-5 md:px-6 py-5 md:py-8 pb-28 md:pb-10">
        {children}
      </main>

      {/* Studio en bulle flottante — réservé aux formateurs */}
      {user.role === 'formateur' && <StudioWidget />}

      {/* Feuille « Plus » (mobile) */}
      {mobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenu(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl shadow-2xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-semibold text-surface-900">Menu</span>
              <button onClick={() => setMobileMenu(false)} className="h-8 w-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-5 pt-1">
              {nav.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={basePath + item.href} onClick={() => setMobileMenu(false)}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border transition-colors active:scale-95"
                    style={active ? { borderColor: PORTAL_GREEN, backgroundColor: '#2050400d' } : { borderColor: '#e7e5e4' }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: active ? PORTAL_GREEN : '#78716c' }} />
                    <span className="text-[11px] font-medium text-center leading-tight px-1" style={{ color: active ? PORTAL_GREEN : '#57534e' }}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/97 backdrop-blur-md border-t border-surface-200/80"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${mobileCols}, minmax(0, 1fr))` }}>
          {primaryNav.map((item) => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={basePath + item.href}
                className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-all duration-200 active:scale-95"
              >
                {active && (
                  <span className="absolute top-0 left-3 right-3 h-[2px] rounded-full" style={{ backgroundColor: PORTAL_GREEN }} />
                )}
                <item.icon className="h-[22px] w-[22px] transition-colors" style={{ color: active ? PORTAL_GREEN : '#a8a29e' }} />
                <span className="text-[10px] font-medium leading-none transition-colors" style={{ color: active ? PORTAL_GREEN : '#a8a29e' }}>
                  {item.short}
                </span>
              </Link>
            )
          })}
          {hasOverflow && (() => {
            const overflowActive = nav.slice(MOBILE_PRIMARY).some((i) => isActive(i.href))
            return (
              <button type="button" onClick={() => setMobileMenu(true)}
                className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-all duration-200 active:scale-95"
              >
                {overflowActive && (
                  <span className="absolute top-0 left-3 right-3 h-[2px] rounded-full" style={{ backgroundColor: PORTAL_GREEN }} />
                )}
                <MoreHorizontal className="h-[22px] w-[22px]" style={{ color: overflowActive ? PORTAL_GREEN : '#a8a29e' }} />
                <span className="text-[10px] font-medium leading-none" style={{ color: overflowActive ? PORTAL_GREEN : '#a8a29e' }}>Plus</span>
              </button>
            )
          })()}
        </div>
      </nav>
    </div>
    </ToastProvider>
  )
}
