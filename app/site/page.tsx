import Link from 'next/link'
import { ArrowRight, ShieldCheck, GraduationCap, Users, CheckCircle2, Building2, UserCheck, Banknote, SlidersHorizontal, Briefcase, DoorOpen, TrendingUp, MonitorPlay, Laptop } from './icons'
import { getPublicSiteData, getBranchesData } from '@/lib/public-site-data'
import { CountUp } from './CountUp'
import { MetierVisual } from './MetierVisual'
import { StoryChapter } from './StoryChapter'
import { Reveal } from './Reveal'
import { Kicker } from './Kicker'
import { Marquee } from './Marquee'
import { BRANCHES } from './branches'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => n.toLocaleString('fr-FR')

const POURQUOI = [
  { Icon: UserCheck, t: 'Des formateurs de terrain', d: 'Des praticiens du métier qui transmettent le geste réel, pas de la théorie hors-sol.' },
  { Icon: Banknote, t: 'Financement clé en main', d: 'On monte votre dossier OPCO / France Travail de A à Z. Vous formez, on gère l’administratif.' },
  { Icon: ShieldCheck, t: 'Qualité certifiée Qualiopi', d: 'Des parcours évalués et tracés, du positionnement à l’attestation.' },
  { Icon: SlidersHorizontal, t: 'Sur-mesure', d: 'Programmes adaptés à votre établissement, vos équipes et vos contraintes d’exploitation.' },
]

export default async function SiteHome() {
  const [{ stats, franchises }, branches] = await Promise.all([getPublicSiteData(), getBranchesData()])
  const brancheCount = new Map(branches.map((b) => [b.slug, b.total]))

  const chapitres = [
    {
      index: 1, eyebrow: 'Recrutement & ouverture', title: 'On vous ouvre avec une équipe déjà prête, grâce à la POEI',
      desc: 'Avant même l’ouverture, on recrute et on forme vos futurs salariés via la POEI (Préparation Opérationnelle à l’Emploi), financée par France Travail. Vous démarrez avec une équipe opérationnelle dès le premier jour.',
      bullets: ['POEI financée par France Travail', 'Recrutement + formation avant l’ouverture', 'Équipe opérationnelle dès le jour 1'],
      Icon: DoorOpen, from: '#134E4A', to: '#0F766E',
      chips: [{ Icon: Briefcase, label: 'POEI · France Travail' }, { Icon: Users, label: 'Recrutement inclus' }],
    },
    {
      index: 2, eyebrow: 'Exploitation', title: 'On fait grandir vos équipes pendant l’exploitation',
      desc: 'Une fois ouvert, on forme vos équipes en poste en continu via le plan de développement des compétences, financé par votre OPCO. La montée en compétence suit le rythme de votre établissement.',
      bullets: ['Plan de développement des compétences', 'Financé par votre OPCO', 'Formations métier pendant l’activité'],
      Icon: TrendingUp, from: '#1E3A8A', to: '#4338CA',
      chips: [{ Icon: Building2, label: 'OPCO' }, { Icon: CheckCircle2, label: `${fmt(stats.sessionsRealisees)} sessions réalisées` }],
      flip: true,
    },
    {
      index: 3, eyebrow: 'Formation continue', title: 'On ancre les acquis en digital avec Learnexa',
      desc: 'Pour ancrer durablement les compétences, notre plateforme e-learning Learnexa prolonge la formation en ligne : vos équipes se forment à leur rythme, où qu’elles soient, avec un suivi de la progression.',
      bullets: ['Notre plateforme e-learning Learnexa', 'Modules à la demande, accessibles partout', 'Suivi de la progression en continu'],
      Icon: MonitorPlay, from: '#4C1D95', to: '#7C3AED',
      chips: [{ Icon: Laptop, label: 'Plateforme Learnexa' }, { Icon: GraduationCap, label: `${fmt(stats.apprenants)} apprenants` }],
      href: 'https://learnexa.fr', cta: 'Découvrir Learnexa',
    },
  ]

  const heroTiles = BRANCHES

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 ll-grid-faint" />
        <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(1200px 600px at 12% -12%, rgba(25,81,68,0.12), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(99,102,241,0.10), transparent 55%)' }} />
        <div className="ll-orb-a absolute -z-10 -top-24 -left-16 h-72 w-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(25,81,68,0.28), transparent 65%)' }} />
        <div className="ll-orb-b absolute -z-10 top-10 right-0 h-80 w-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 65%)' }} />

        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-16 md:pb-24 grid lg:grid-cols-12 gap-12 lg:gap-12 items-center">
          <div className="ll-rise lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#195144]/10 text-[#195144] px-3 py-1 text-xs font-semibold mb-7">
              <ShieldCheck className="h-3.5 w-3.5" /> Organisme certifié Qualiopi
            </div>
            <h1 className="ll-display ll-fluid-hero text-[#14110F] text-balance">
              Former les métiers de bouche avec l’exigence du{' '}
              <span className="italic bg-gradient-to-r from-[#195144] to-[#6366F1] bg-clip-text text-transparent">geste juste</span>.
            </h1>
            <p className="mt-7 text-lg md:text-xl text-[#57534E] max-w-xl leading-relaxed">
              Du recrutement à la rentabilité, on est à vos côtés : ouverture avec la POEI, montée en compétence
              de vos équipes pendant l’exploitation, puis formation continue en e-learning avec Learnexa.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/site/formations" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#195144] text-white text-sm font-semibold hover:bg-[#123f34] ll-lift">
                Découvrir nos formations <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/site/contact" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[#195144]/25 text-[#195144] text-sm font-semibold hover:bg-[#195144]/5 transition-colors">
                Parler à un conseiller
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#78716C]">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#195144]" /> Financement OPCO &amp; France Travail</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#195144]" /> Formateurs praticiens du métier</span>
            </div>
          </div>

          {/* Collage métier (données live) — asymétrique */}
          {heroTiles.length >= 2 && (
            <div className="ll-rise lg:col-span-6 grid grid-cols-2 gap-4 sm:gap-5 relative" style={{ animationDelay: '0.12s' }}>
              {heroTiles.map((b, i) => (
                <Link key={b.slug} href={`/site/branches/${b.slug}`}
                  className={`group rounded-3xl overflow-hidden shadow-sm ring-1 ring-black/5 ll-lift ${i % 2 === 1 ? 'translate-y-6 sm:translate-y-10' : ''}`}>
                  <MetierVisual nom={b.label} label={b.label} height={i % 2 === 1 ? 'h-56 sm:h-72' : 'h-52 sm:h-64'} />
                  <div className="bg-white px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-[#78716C]">{brancheCount.get(b.slug) || 0} formation{(brancheCount.get(b.slug) || 0) > 1 ? 's' : ''}</span>
                    <ArrowRight className="h-4 w-4 text-[#195144] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                  </div>
                </Link>
              ))}
              {/* Badge flottant preuve */}
              <div className="hidden sm:flex absolute -left-6 bottom-2 items-center gap-3 rounded-2xl bg-white shadow-lg shadow-black/10 ring-1 ring-black/5 px-4 py-3">
                <span className="h-9 w-9 rounded-xl bg-[#195144]/10 flex items-center justify-center"><GraduationCap className="h-5 w-5 text-[#195144]" /></span>
                <span className="leading-tight">
                  <span className="block font-heading font-black text-lg text-[#14110F] tabular-nums">{fmt(stats.apprenants)}</span>
                  <span className="block text-[11px] text-[#78716C]">apprenants formés</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── STATS (live) ── */}
      <section className="border-y border-[#195144]/10 bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10 md:divide-x md:divide-[#195144]/10">
          {[
            { v: stats.formations, l: 'programmes au catalogue', Icon: GraduationCap },
            { v: stats.apprenants, l: 'apprenants formés', Icon: Users },
            { v: stats.sessionsRealisees, l: 'sessions réalisées', Icon: CheckCircle2 },
            { v: stats.entreprises, l: 'entreprises accompagnées', Icon: Building2 },
          ].map((s, i) => (
            <div key={s.l} className={i > 0 ? 'md:pl-8' : ''}>
              <div className="flex items-center gap-1.5 text-[#195144] mb-2"><s.Icon className="h-4 w-4" /></div>
              <div className="ll-display text-4xl md:text-[52px] text-[#14110F] leading-none"><CountUp value={s.v} /></div>
              <div className="text-xs text-[#78716C] mt-2 uppercase tracking-wide">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BRANCHES MÉTIER ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="max-w-2xl">
          <Kicker className="mb-4">Votre métier</Kicker>
          <h2 className="ll-display ll-fluid-h2 text-[#14110F] text-balance">Des formations pensées pour votre activité</h2>
          <p className="mt-4 text-lg text-[#57534E]">Identifiez-vous par votre métier — on vous montre ce à quoi vous avez droit, financement compris.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {BRANCHES.map((b, i) => (
            <Reveal key={b.slug} delay={(i % 2) * 90} className="h-full">
              <Link href={`/site/branches/${b.slug}`} className="group h-full flex flex-col rounded-3xl overflow-hidden bg-white ring-1 ring-black/5 hover:ring-[#195144]/25 hover:shadow-xl hover:shadow-black/5 ll-lift">
                <MetierVisual nom={b.label} label={b.label} height="h-48 md:h-52" />
                <div className="p-5 md:p-6 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[15px] text-[#57534E]">{b.tagline}</div>
                    <div className="text-xs text-[#A8A29E] mt-1">{brancheCount.get(b.slug) || 0} formation{(brancheCount.get(b.slug) || 0) > 1 ? 's' : ''}</div>
                  </div>
                  <span className="shrink-0 h-10 w-10 rounded-full bg-[#195144]/8 flex items-center justify-center text-[#195144] group-hover:bg-[#195144] group-hover:text-white transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── POURQUOI NOUS ── */}
      <section className="bg-[#FAFAFA] border-y border-[#195144]/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <Kicker className="mb-4">Pourquoi Lab Learning</Kicker>
            <h2 className="ll-display ll-fluid-h2 text-[#14110F] text-balance">Un partenaire formation, pas juste un catalogue</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POURQUOI.map((p, i) => (
              <Reveal key={p.t} delay={(i % 4) * 80}>
              <div className="group h-full rounded-2xl border border-[#195144]/10 bg-white p-6 hover:shadow-lg hover:shadow-black/5 hover:border-[#195144]/25 ll-lift">
                <span className="h-11 w-11 rounded-xl bg-[#195144]/8 flex items-center justify-center mb-4 group-hover:bg-[#195144] transition-colors"><p.Icon className="h-5 w-5 text-[#195144] group-hover:text-white transition-colors" /></span>
                <div className="font-heading font-semibold text-[#14110F]">{p.t}</div>
                <p className="mt-1.5 text-sm text-[#57534E] leading-relaxed">{p.d}</p>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORYTELLING CHAPITRÉ : du recrutement à la rentabilité ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <Reveal className="max-w-3xl">
          <Kicker className="mb-4">Notre accompagnement</Kicker>
          <h2 className="ll-display ll-fluid-h1 text-[#14110F] text-balance">
            Du recrutement à la rentabilité, <span className="text-[#195144]">on est avec vous</span>.
          </h2>
          <p className="mt-5 text-lg md:text-xl text-[#57534E] leading-relaxed">
            De l’ouverture avec la POEI, à la montée en compétence de vos équipes, jusqu’à la formation continue
            en e-learning : un partenaire unique sur tout le cycle de vie de votre établissement.
          </p>
        </Reveal>
        <div className="mt-16 md:mt-20 space-y-20 md:space-y-28">
          {chapitres.map((c) => <Reveal key={c.index}><StoryChapter {...(c as any)} /></Reveal>)}
        </div>
      </section>

      {/* ── PREUVES / FRANCHISES (marquee live) ── */}
      {franchises.length > 0 && (
        <section className="bg-[#FAFAFA] border-y border-[#195144]/10 py-16 md:py-20 overflow-hidden">
          <div className="max-w-6xl mx-auto px-5 md:px-8 text-center">
            <Kicker center className="mb-4 justify-center">Ils nous font confiance</Kicker>
            <h2 className="ll-display ll-fluid-h2 text-[#14110F] tracking-heading">Des réseaux franchisés nationaux</h2>
            <p className="mt-3 text-[#57534E] max-w-xl mx-auto">Des enseignes multi-sites nous confient la montée en compétence de leurs équipes, partout en France.</p>
          </div>
          <div className="mt-10">
            <Marquee items={franchises.map((f) => ({ nom: f.nom, logo_url: f.logo_url, nombre_etablissements: f.nombre_etablissements }))} />
          </div>
          <div className="mt-10 text-center">
            <Link href="/site/partenaires" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#195144] hover:gap-2.5 transition-all">
              Voir tous nos partenaires <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-24">
        <Reveal>
        <div className="rounded-[32px] bg-[#14110F] text-white px-6 md:px-16 py-16 md:py-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-0 opacity-70" style={{ background: 'radial-gradient(600px 300px at 20% 0%, rgba(25,81,68,0.5), transparent 60%), radial-gradient(500px 260px at 100% 100%, rgba(99,102,241,0.35), transparent 55%)' }} />
          <div className="relative">
            <Kicker tone="light" center className="mb-5 justify-center">Prêt à démarrer</Kicker>
            <h2 className="ll-display ll-fluid-h1 text-balance max-w-3xl mx-auto text-white">Prêt à faire monter vos équipes en compétences ?</h2>
            <p className="mt-4 text-white/70 max-w-xl mx-auto text-lg">Nous étudions votre besoin, montons le financement OPCO et planifions les sessions.</p>
            <Link href="/site/contact" className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#14110F] text-sm font-semibold hover:bg-[#F6F4EF] ll-lift">
              Demander un devis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        </Reveal>
      </section>
    </>
  )
}
