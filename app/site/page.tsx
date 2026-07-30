import Link from 'next/link'
import { ArrowRight, ShieldCheck, GraduationCap, Users, CheckCircle2, Building2, UserCheck, Banknote, SlidersHorizontal, Target, ClipboardCheck, Briefcase, ChefHat, Award } from 'lucide-react'
import { getPublicSiteData } from '@/lib/public-site-data'
import { CountUp } from './CountUp'
import { MetierVisual } from './MetierVisual'
import { metierStyle } from './metier'
import { StoryChapter } from './StoryChapter'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => n.toLocaleString('fr-FR')

const POURQUOI = [
  { Icon: UserCheck, t: 'Des formateurs de terrain', d: 'Des praticiens du métier qui transmettent le geste réel, pas de la théorie hors-sol.' },
  { Icon: Banknote, t: 'Financement clé en main', d: 'On monte votre dossier OPCO / France Travail de A à Z. Vous formez, on gère l’administratif.' },
  { Icon: ShieldCheck, t: 'Qualité certifiée Qualiopi', d: 'Des parcours évalués et tracés, du positionnement à l’attestation.' },
  { Icon: SlidersHorizontal, t: 'Sur-mesure', d: 'Programmes adaptés à votre établissement, vos équipes et vos contraintes d’exploitation.' },
]

export default async function SiteHome() {
  const { stats, categories, franchises } = await getPublicSiteData()

  const chapitres = [
    {
      index: 1, eyebrow: 'Analyse', title: 'On cerne le besoin, avant tout',
      desc: 'Chaque parcours démarre par un diagnostic : niveau, attentes, objectifs. On construit un programme qui colle à votre métier, pas un catalogue générique.',
      bullets: ['Audit du niveau et des attentes', 'Objectifs pédagogiques cadrés Qualiopi', 'Programme adapté à votre établissement'],
      Icon: Target, from: '#134E4A', to: '#0F766E',
      chips: [{ Icon: Target, label: 'Positionnement à l’entrée' }, { Icon: ClipboardCheck, label: 'Cadrage Qualiopi' }],
    },
    {
      index: 2, eyebrow: 'Financement', title: 'On monte le financement à votre place',
      desc: 'OPCO, France Travail, plan de développement des compétences : on prépare le dossier de A à Z. Vous formez vos équipes, on gère toute l’administration.',
      bullets: ['Dossier OPCO / France Travail clé en main', 'Devis et convention conformes', 'Zéro paperasse de votre côté'],
      Icon: Banknote, from: '#1E3A8A', to: '#4338CA',
      chips: [{ Icon: Building2, label: 'OPCO' }, { Icon: Briefcase, label: 'France Travail' }],
      href: '/site/financements', cta: 'Voir les financements', flip: true,
    },
    {
      index: 3, eyebrow: 'Formation', title: 'On forme sur le terrain, sur le geste',
      desc: 'Des formateurs praticiens interviennent dans vos murs ou à distance. On transmet le geste réel du métier, au rythme de vos équipes et de votre exploitation.',
      bullets: ['Formateurs praticiens du métier', 'Présentiel dans vos murs ou à distance', 'Centré sur la pratique, pas la théorie'],
      Icon: ChefHat, from: '#92400E', to: '#D97706',
      chips: [{ Icon: Users, label: `${fmt(stats.formateurs)} formateurs` }, { Icon: CheckCircle2, label: `${fmt(stats.sessionsRealisees)} sessions réalisées` }],
    },
    {
      index: 4, eyebrow: 'Certification', title: 'On certifie et on prouve les acquis',
      desc: 'Évaluation entrée/sortie, attestation de fin de formation, mesure de la satisfaction à froid : la progression est tracée et conforme aux exigences Qualiopi.',
      bullets: ['Évaluation des acquis entrée / sortie', 'Attestation de fin de formation', 'Suivi de satisfaction à froid'],
      Icon: Award, from: '#14532D', to: '#16A34A',
      chips: [{ Icon: GraduationCap, label: `${fmt(stats.apprenants)} apprenants formés` }, { Icon: ShieldCheck, label: 'Certifié Qualiopi' }],
      flip: true,
    },
  ]

  const heroTiles = categories.slice(0, 4)

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(1200px 600px at 15% -10%, rgba(25,81,68,0.12), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(99,102,241,0.10), transparent 55%)' }} />
        <div className="ll-orb-a absolute -z-10 -top-24 -left-16 h-72 w-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(25,81,68,0.28), transparent 65%)' }} />
        <div className="ll-orb-b absolute -z-10 top-10 right-0 h-80 w-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 65%)' }} />

        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-16 md:pb-20 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="ll-rise">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#195144]/10 text-[#195144] px-3 py-1 text-xs font-semibold mb-6">
              <ShieldCheck className="h-3.5 w-3.5" /> Organisme certifié Qualiopi
            </div>
            <h1 className="font-heading font-black tracking-heading text-[#14110F] text-4xl sm:text-5xl md:text-[58px] leading-[1.03] text-balance">
              Former les métiers de bouche avec l'exigence du{' '}
              <span className="italic bg-gradient-to-r from-[#195144] to-[#6366F1] bg-clip-text text-transparent">geste juste</span>.
            </h1>
            <p className="mt-6 text-lg text-[#57534E] max-w-xl leading-relaxed">
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

          {/* Collage métier (données live) */}
          {heroTiles.length >= 2 && (
            <div className="ll-rise grid grid-cols-2 gap-3 sm:gap-4" style={{ animationDelay: '0.12s' }}>
              {heroTiles.map((c, i) => (
                <Link key={c.nom} href="/site/formations"
                  className={`group rounded-3xl overflow-hidden shadow-sm ring-1 ring-black/5 ${i % 2 === 1 ? 'translate-y-5' : ''}`}>
                  <MetierVisual nom={c.nom} label={c.nom} height="h-40 sm:h-48" />
                  <div className="bg-white px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-[#78716C]">{c.formations.length} formation{c.formations.length > 1 ? 's' : ''}</span>
                    <ArrowRight className="h-4 w-4 text-[#195144] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── STATS (live) ── */}
      <section className="border-y border-[#195144]/10 bg-white/60">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: stats.formations, l: 'programmes au catalogue', Icon: GraduationCap },
            { v: stats.apprenants, l: 'apprenants formés', Icon: Users },
            { v: stats.sessionsRealisees, l: 'sessions réalisées', Icon: CheckCircle2 },
            { v: stats.entreprises, l: 'entreprises accompagnées', Icon: Building2 },
          ].map((s) => (
            <div key={s.l}>
              <div className="flex items-center gap-1.5 text-[#195144] mb-1"><s.Icon className="h-4 w-4" /></div>
              <div className="font-heading font-black text-3xl md:text-4xl text-[#14110F] tabular-nums"><CountUp value={s.v} /></div>
              <div className="text-xs text-[#78716C] mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DOMAINES (catégories live, cards visuelles) ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-2">Nos domaines</div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#14110F] tracking-heading text-balance">Des formations pour chaque métier</h2>
          <p className="mt-3 text-[#57534E]">Un catalogue vivant, mis à jour en continu. {fmt(stats.formations)} programmes couvrant l'ensemble de la filière.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 9).map((c) => {
            const s = metierStyle(c.nom)
            return (
              <Link key={c.nom} href="/site/formations" className="group rounded-3xl overflow-hidden bg-white ring-1 ring-black/5 hover:ring-[#195144]/25 hover:shadow-md transition-all">
                <MetierVisual nom={c.nom} height="h-28" />
                <div className="p-5">
                  <div className="font-heading font-semibold text-lg text-[#14110F] leading-snug">{c.nom}</div>
                  <div className="text-sm text-[#78716C] mt-1">{c.formations.length} formation{c.formations.length > 1 ? 's' : ''}</div>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all" style={{ color: s.ink }}>
                    Explorer <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── POURQUOI NOUS ── */}
      <section className="bg-white/60 border-y border-[#195144]/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-2">Pourquoi Lab Learning</div>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#14110F] tracking-heading text-balance">Un partenaire formation, pas juste un catalogue</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POURQUOI.map((p) => (
              <div key={p.t} className="rounded-2xl border border-[#195144]/10 bg-white p-6 hover:shadow-sm transition-shadow">
                <span className="h-11 w-11 rounded-xl bg-[#195144]/8 flex items-center justify-center mb-4"><p.Icon className="h-5 w-5 text-[#195144]" /></span>
                <div className="font-heading font-semibold text-[#14110F]">{p.t}</div>
                <p className="mt-1.5 text-sm text-[#57534E] leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORYTELLING CHAPITRÉ ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-2">Comment ça se passe</div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#14110F] tracking-heading text-balance">Du premier échange à l'attestation, on gère tout</h2>
          <p className="mt-3 text-[#57534E]">Un accompagnement de bout en bout, en quatre temps.</p>
        </div>
        <div className="mt-14 space-y-16 md:space-y-24">
          {chapitres.map((c) => <StoryChapter key={c.index} {...(c as any)} />)}
        </div>
      </section>

      {/* ── FRANCHISES (partenaires live) ── */}
      {franchises.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-2">Ils nous font confiance</div>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-[#14110F] tracking-heading">Des réseaux franchisés nationaux</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {franchises.slice(0, 8).map((f) => (
              <div key={f.nom} className="rounded-2xl border border-[#195144]/10 bg-white p-5 flex flex-col items-center justify-center gap-2 h-28 hover:shadow-sm transition-shadow">
                {f.logo_url
                  ? <img src={f.logo_url} alt={f.nom} className="h-11 w-auto max-w-[130px] object-contain grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all" />
                  : <span className="font-heading font-semibold text-[#57534E] text-center text-sm">{f.nom}</span>}
                {f.nombre_etablissements ? <span className="text-[11px] text-[#A8A29E]">{f.nombre_etablissements} établissements</span> : null}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/site/partenaires" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#195144] hover:gap-2.5 transition-all">
              Voir tous nos partenaires <ArrowRight className="h-4 w-4" />
            </Link>
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
