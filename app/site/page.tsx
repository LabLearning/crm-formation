import Link from 'next/link'
import { ArrowRight, ShieldCheck, GraduationCap, Users, CheckCircle2, Building2, Clock, Sparkles } from 'lucide-react'
import { getPublicSiteData } from '@/lib/public-site-data'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => n.toLocaleString('fr-FR')

export default async function SiteHome() {
  const { stats, categories, franchises } = await getPublicSiteData()

  const parcours = [
    { t: 'Positionnement', d: 'Évaluation du niveau et des attentes de chaque apprenant avant l\'entrée en formation.' },
    { t: 'Formation', d: 'Sessions animées par des formateurs experts, en présentiel ou à distance, centrées sur le geste.' },
    { t: 'Évaluation', d: 'Questionnaires de validation des acquis à chaud, mesure de la progression entrée/sortie.' },
    { t: 'Attestation', d: 'Attestation de fin de formation et suivi de la satisfaction à froid (Qualiopi).' },
  ]

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(1200px 600px at 15% -10%, rgba(25,81,68,0.14), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(99,102,241,0.12), transparent 55%)' }} />
        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-20 md:pt-28 pb-16 md:pb-24">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#195144]/10 text-[#195144] px-3 py-1 text-xs font-semibold mb-6">
            <ShieldCheck className="h-3.5 w-3.5" /> Organisme certifié Qualiopi
          </div>
          <h1 className="font-heading font-black tracking-heading text-[#14110F] text-4xl sm:text-5xl md:text-[64px] leading-[1.02] max-w-4xl text-balance">
            Former les métiers de bouche avec l'exigence du{' '}
            <span className="italic bg-gradient-to-r from-[#195144] to-[#6366F1] bg-clip-text text-transparent">geste juste</span>.
          </h1>
          <p className="mt-6 text-lg text-[#57534E] max-w-2xl leading-relaxed">
            Restauration, boucherie, boulangerie, pâtisserie, hôtellerie — nous formons vos équipes avec des programmes
            concrets, des formateurs de terrain et un accompagnement du financement à l'attestation.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/site/formations" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#195144] text-white text-sm font-semibold hover:bg-[#123f34] transition-colors">
              Découvrir nos formations <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/site/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#195144]/25 text-[#195144] text-sm font-semibold hover:bg-[#195144]/5 transition-colors">
              Parler à un conseiller
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS (live) ── */}
      <section className="border-y border-[#195144]/10 bg-white/50">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: `${fmt(stats.formations)}`, l: 'programmes au catalogue', Icon: GraduationCap },
            { v: `${fmt(stats.apprenants)}`, l: 'apprenants formés', Icon: Users },
            { v: `${fmt(stats.sessionsRealisees)}`, l: 'sessions réalisées', Icon: CheckCircle2 },
            { v: `${fmt(stats.entreprises)}`, l: 'entreprises accompagnées', Icon: Building2 },
          ].map((s) => (
            <div key={s.l}>
              <div className="flex items-center gap-1.5 text-[#195144] mb-1"><s.Icon className="h-4 w-4" /></div>
              <div className="font-heading font-black text-3xl md:text-4xl text-[#14110F] tabular-nums">{s.v}</div>
              <div className="text-xs text-[#78716C] mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DOMAINES (catégories live) ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-2">Nos domaines</div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#14110F] tracking-heading text-balance">Des formations pour chaque métier</h2>
          <p className="mt-3 text-[#57534E]">Un catalogue vivant, mis à jour en continu. {fmt(stats.formations)} programmes couvrant l'ensemble de la filière.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 9).map((c) => (
            <Link key={c.nom} href="/site/formations" className="group rounded-2xl border border-[#195144]/10 bg-white p-5 hover:border-[#195144]/30 hover:shadow-sm transition-all">
              <div className="h-10 w-10 rounded-xl bg-[#195144]/8 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-[#195144]" />
              </div>
              <div className="font-heading font-semibold text-[#14110F]">{c.nom}</div>
              <div className="text-sm text-[#78716C] mt-1">{c.formations.length} formation{c.formations.length > 1 ? 's' : ''}</div>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#195144] opacity-0 group-hover:opacity-100 transition-opacity">
                Explorer <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── PARCOURS ── */}
      <section className="bg-[#195144] text-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8ec9b8] mb-2">Notre approche</div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl tracking-heading max-w-2xl text-balance">Un parcours structuré, de l'entrée à l'attestation</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {parcours.map((p, i) => (
              <div key={p.t}>
                <div className="font-heading font-black text-5xl text-white/15 tabular-nums">{String(i + 1).padStart(2, '0')}</div>
                <div className="font-heading font-semibold text-lg mt-2">{p.t}</div>
                <p className="text-sm text-white/70 mt-1.5 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FRANCHISES (partenaires live) ── */}
      {franchises.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-2">Ils nous font confiance</div>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-[#14110F] tracking-heading">Des réseaux franchisés nationaux</h2>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-8">
            {franchises.map((f) => (
              <div key={f.nom} className="flex flex-col items-center gap-2">
                {f.logo_url
                  ? <img src={f.logo_url} alt={f.nom} className="h-12 w-auto max-w-[140px] object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all" />
                  : <span className="font-heading font-semibold text-[#57534E]">{f.nom}</span>}
                {f.nombre_etablissements ? <span className="text-[11px] text-[#A8A29E]">{f.nombre_etablissements} établissements</span> : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="rounded-3xl bg-[#14110F] text-white px-6 md:px-14 py-14 md:py-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-0 opacity-70" style={{ background: 'radial-gradient(600px 300px at 20% 0%, rgba(25,81,68,0.5), transparent 60%), radial-gradient(500px 260px at 100% 100%, rgba(99,102,241,0.35), transparent 55%)' }} />
          <div className="relative">
            <h2 className="font-heading font-bold text-3xl md:text-4xl tracking-heading text-balance max-w-2xl mx-auto">Prêt à faire monter vos équipes en compétences ?</h2>
            <p className="mt-3 text-white/70 max-w-xl mx-auto">Nous étudions votre besoin, montons le financement OPCO et planifions les sessions.</p>
            <Link href="/site/contact" className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#14110F] text-sm font-semibold hover:bg-[#F6F4EF] transition-colors">
              Demander un devis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
