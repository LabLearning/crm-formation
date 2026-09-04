'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, X, ArrowRight, ChevronDown, GraduationCap, Banknote, HeartHandshake, TrendingUp, Users, Bulb, Sparkles } from './icons'
import { BRANCHES } from './branches'

/**
 * Navigation du site : le logo ramène à l'accueil, deux menus déroulants
 * (« Formations » par métier, « L'organisme » pour les pages de preuve),
 * Starkk et Financements en accès direct, un seul CTA contact.
 */
const ORGANISME = [
  { href: '/site/a-propos', label: 'À propos', desc: 'Qui nous sommes, notre pédagogie', Icon: Users },
  { href: '/site/partenaires', label: 'Nos clients', desc: 'Enseignes et établissements accompagnés', Icon: HeartHandshake },
  { href: '/site/resultats', label: 'Résultats', desc: 'Nos indicateurs, en toute transparence', Icon: TrendingUp },
  { href: '/site/faq', label: 'FAQ', desc: 'Les réponses aux questions fréquentes', Icon: Bulb },
]

export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dropdown, setDropdown] = useState<null | 'formations' | 'organisme'>(null)
  const fermeture = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isActive = (h: string) => (h === '/site' ? pathname === '/site' : pathname.startsWith(h))
  const formationsActive = pathname.startsWith('/site/formations') || pathname.startsWith('/site/branches')
  const organismeActive = ORGANISME.some((l) => isActive(l.href))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Petite tolérance à la sortie du survol : le menu ne claque pas
  // quand le curseur traverse l'interstice.
  const ouvrir = (quel: 'formations' | 'organisme') => { if (fermeture.current) clearTimeout(fermeture.current); setDropdown(quel) }
  const fermer = () => { fermeture.current = setTimeout(() => setDropdown(null), 150) }

  const lienNav = (active: boolean) =>
    `group relative inline-flex items-center gap-1 py-1.5 text-sm font-medium transition-colors ${active ? 'text-[#14110F]' : 'text-[#57534E] hover:text-[#14110F]'}`
  const soulignement = (active: boolean) =>
    `absolute left-0 -bottom-0.5 h-[2px] rounded-full bg-[#205040] transition-all duration-300 ease-out ${active ? 'w-full' : 'w-0 group-hover:w-full'}`

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-xl border-b border-black/[0.06] shadow-[0_1px_20px_-8px_rgba(0,0,0,0.15)]'
        : 'bg-white/60 backdrop-blur-md border-b border-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-6">
        <Link href="/site" className="flex items-center shrink-0" aria-label="Lab Learning, accueil">
          <img src="/logo-lablearning.svg" alt="Lab Learning" className="h-7 w-auto" />
        </Link>

        {/* Liens desktop */}
        <nav className="hidden lg:flex items-center gap-7">
          {/* Formations : menu par métier */}
          <div className="relative" onMouseEnter={() => ouvrir('formations')} onMouseLeave={fermer}>
            <Link href="/site/formations" className={lienNav(formationsActive)}>
              Formations
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${dropdown === 'formations' ? 'rotate-180' : ''}`} />
              <span className={soulignement(formationsActive)} />
            </Link>
            {dropdown === 'formations' && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3">
                <div className="w-[560px] rounded-3xl bg-white ring-1 ring-black/5 shadow-2xl shadow-black/15 p-3">
                  {/* Un métier par carte : photo vignette teintée + icône + texte */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {BRANCHES.map((b) => (
                      <Link key={b.slug} href={`/site/branches/${b.slug}`} onClick={() => setDropdown(null)}
                        className="group/item flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[#FAFAF9] transition-colors">
                        <span className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden ring-1 ring-black/5">
                          <img loading="lazy" src={`/site/metiers/${b.img}.webp`} alt=""
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover/item:scale-110" />
                          <span className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${b.from}66, transparent 70%)` }} />
                          <span className="absolute bottom-1 left-1 h-5 w-5 rounded-md bg-white/85 backdrop-blur-sm flex items-center justify-center" style={{ color: b.from }}>
                            <b.Icon className="h-3 w-3" />
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[#14110F] leading-snug">{b.label}</span>
                          <span className="block text-xs text-[#78716C] mt-0.5 truncate">{b.tagline}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#F0EEE9] grid grid-cols-2 gap-1.5">
                    <Link href="/site/formations" onClick={() => setDropdown(null)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm font-semibold text-[#205040] hover:bg-[#205040]/5 transition-colors">
                      <span className="h-8 w-8 rounded-lg bg-[#205040]/8 flex items-center justify-center shrink-0"><GraduationCap className="h-4 w-4" /></span>
                      Toutes nos formations
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </Link>
                    <Link href="/site/financements" onClick={() => setDropdown(null)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm font-semibold text-[#205040] hover:bg-[#205040]/5 transition-colors">
                      <span className="h-8 w-8 rounded-lg bg-[#205040]/8 flex items-center justify-center shrink-0"><Banknote className="h-4 w-4" /></span>
                      Faire financer
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Financements : accès direct */}
          <Link href="/site/financements" className={lienNav(isActive('/site/financements'))}>
            Financements
            <span className={soulignement(isActive('/site/financements'))} />
          </Link>

          {/* Starkk : accès direct, marqué IA */}
          <Link href="/site/starkk" className={lienNav(isActive('/site/starkk'))}>
            <Sparkles className="h-3.5 w-3.5 text-[#205040]" />
            Starkk
            <span className={soulignement(isActive('/site/starkk'))} />
          </Link>

          {/* L'organisme : menu preuve et confiance */}
          <div className="relative" onMouseEnter={() => ouvrir('organisme')} onMouseLeave={fermer}>
            <button type="button" className={lienNav(organismeActive)}>
              L’organisme
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${dropdown === 'organisme' ? 'rotate-180' : ''}`} />
              <span className={soulignement(organismeActive)} />
            </button>
            {dropdown === 'organisme' && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3">
                <div className="w-[320px] rounded-3xl bg-white ring-1 ring-black/5 shadow-2xl shadow-black/15 p-2">
                  {ORGANISME.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setDropdown(null)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[#FAFAF9] transition-colors">
                      <span className="h-9 w-9 shrink-0 rounded-xl bg-[#205040]/8 flex items-center justify-center text-[#205040]">
                        <l.Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#14110F] leading-snug">{l.label}</span>
                        <span className="block text-xs text-[#78716C] mt-0.5 truncate">{l.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/site/contact"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#205040] text-white text-sm font-semibold pl-4 pr-3 py-2 hover:bg-[#123f34] ll-lift">
            Demander un devis
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
        <div className="lg:hidden border-t border-black/[0.06] bg-white/95 backdrop-blur-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Formations</div>
            <Link href="/site/formations" onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                formationsActive ? 'bg-[#205040]/8 text-[#205040]' : 'text-[#14110F] hover:bg-black/[0.03]'
              }`}>
              Toutes nos formations
              <ArrowRight className="h-4 w-4" />
            </Link>
            {BRANCHES.map((b) => (
              <Link key={b.slug} href={`/site/branches/${b.slug}`} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 pl-4 pr-3 py-2 rounded-2xl text-sm transition-colors ${
                  pathname.startsWith(`/site/branches/${b.slug}`) ? 'bg-[#205040]/8 text-[#205040] font-medium' : 'text-[#57534E] hover:bg-black/[0.03]'
                }`}>
                <span className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden ring-1 ring-black/5">
                  <img loading="lazy" src={`/site/metiers/${b.img}.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${b.from}55, transparent 70%)` }} />
                </span>
                <span className="flex-1">{b.label}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-30" />
              </Link>
            ))}
            <Link href="/site/financements" onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-medium transition-colors ${
                isActive('/site/financements') ? 'bg-[#205040]/8 text-[#205040]' : 'text-[#44403C] hover:bg-black/[0.03]'
              }`}>
              Financements
              <ArrowRight className={`h-4 w-4 ${isActive('/site/financements') ? 'opacity-100' : 'opacity-30'}`} />
            </Link>

            <div className="my-1 border-t border-[#F0EEE9]" />
            <Link href="/site/starkk" onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                isActive('/site/starkk') ? 'bg-[#205040]/8 text-[#205040]' : 'text-[#14110F] hover:bg-black/[0.03]'
              }`}>
              <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#205040]" /> Starkk, notre IA</span>
              <ArrowRight className="h-4 w-4 opacity-30" />
            </Link>

            <div className="my-1 border-t border-[#F0EEE9]" />
            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">L’organisme</div>
            {ORGANISME.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-medium transition-colors ${
                  isActive(l.href) ? 'bg-[#205040]/8 text-[#205040]' : 'text-[#44403C] hover:bg-black/[0.03]'
                }`}>
                {l.label}
                <ArrowRight className={`h-4 w-4 ${isActive(l.href) ? 'opacity-100' : 'opacity-30'}`} />
              </Link>
            ))}
            <Link href="/site/contact" onClick={() => setOpen(false)}
              className="mt-1 mb-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#205040] text-white text-sm font-semibold hover:bg-[#123f34]">
              Demander un devis <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
