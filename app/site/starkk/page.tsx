import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, Sparkles, AiChat, AiBrain, AiSecurity,
  Users, UserCheck, Building2, GraduationCap, Calendar, FileCheck2, Clock, ShieldCheck,
} from '../icons'
import { Kicker } from '../Kicker'
import { Reveal } from '../Reveal'
import { StarkkHero } from './StarkkHero'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Starkk, notre intelligence artificielle',
  description:
    "Starkk est l'assistant IA de Lab Learning : il connaît vos formations, vos sessions et vos documents, répond à vos questions et vous fait gagner du temps, sous contrôle humain.",
  alternates: { canonical: '/starkk' },
}

const CAPACITES = [
  { Icon: AiChat, t: 'Répond à vos questions', d: "Où en est ma session ? Quand arrive mon attestation ? Qui est mon formateur ? Starkk répond immédiatement, à partir de votre dossier réel." },
  { Icon: AiBrain, t: 'Connaît votre dossier', d: 'Formations, sessions, émargements, conventions, factures : Starkk s’appuie sur les données à jour de votre espace, pas sur des généralités.' },
  { Icon: FileCheck2, t: 'Retrouve vos documents', d: 'Convention, convocation, attestation, certificat de réalisation : il localise le bon document et vous le remet, sans que vous ayez à fouiller vos emails.' },
  { Icon: Calendar, t: 'Suit vos échéances', d: 'Signatures en attente, sessions à venir, dossiers de financement : Starkk garde le fil et vous alerte au bon moment.' },
  { Icon: Clock, t: 'Disponible en continu', d: 'Le soir après le service ou le dimanche matin : Starkk répond quand vous travaillez, pas seulement aux heures de bureau.' },
  { Icon: AiSecurity, t: 'Jamais sans votre accord', d: 'Starkk propose, vous confirmez. Aucune action sortante, aucun envoi, aucune modification sans validation humaine explicite.' },
]

const PUBLICS = [
  {
    Icon: Building2, badge: 'Gérants et entreprises', titre: 'Votre copilote formation',
    points: [
      'Suivi de vos sessions et de vos équipes en un message',
      'État de vos conventions, factures et financements OPCO',
      'Les documents de vos salariés retrouvés instantanément',
    ],
    from: '#134E4A', to: '#0F766E',
  },
  {
    Icon: UserCheck, badge: 'Formateurs', titre: 'Moins d’administratif, plus de terrain',
    points: [
      'Planning, lieux et effectifs de vos interventions',
      'Émargements et grilles de saisie à jour, sans relance',
      'Les infos de session accessibles depuis votre téléphone',
    ],
    from: '#1E3A8A', to: '#4338CA',
  },
  {
    Icon: GraduationCap, badge: 'Apprenants', titre: 'Un accompagnement à portée de main',
    points: [
      'Vos convocations, horaires et lieux de formation',
      'Vos attestations et certificats dès qu’ils sont prêts',
      'Une réponse simple à chaque question sur votre parcours',
    ],
    from: '#4C1D95', to: '#7C3AED',
  },
]

const ETAPES = [
  { n: '01', t: 'Vous demandez', d: 'En langage naturel, comme à un collègue : « envoie-moi ma convention », « où en est la session de mardi ? »' },
  { n: '02', t: 'Starkk prépare', d: 'Il consulte votre dossier, rassemble les éléments et vous propose une réponse ou une action prête à partir.' },
  { n: '03', t: 'Vous validez', d: 'Rien ne part sans vous : chaque action est confirmée d’un clic par un humain avant d’être exécutée.' },
]

export default function SiteStarkk() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-[#0C1210] text-white">
        <div className="absolute inset-0 -z-0 opacity-80" style={{ background: 'radial-gradient(900px 500px at 15% -10%, rgba(56,197,136,0.22), transparent 60%), radial-gradient(700px 400px at 100% 10%, rgba(99,102,241,0.18), transparent 55%)' }} />
        <div className="relative max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-16 md:pb-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 ll-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3.5 py-1.5 text-xs font-semibold tracking-wide uppercase text-[#5CD9A0]">
              <Sparkles className="h-3.5 w-3.5" /> Notre intelligence artificielle
            </span>
            <h1 className="mt-6 ll-display ll-fluid-hero text-white text-balance">
              Voici <span className="italic inline-block bg-gradient-to-r from-[#5CD9A0] to-[#38C588] bg-clip-text text-transparent px-2 -mx-2 pb-3 -mb-3">Starkk</span>.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/70 max-w-xl leading-relaxed">
              L’assistant IA de Lab Learning connaît vos formations, vos sessions et vos documents.
              Il répond, retrouve, prépare. Vous gardez la main : rien ne part sans votre validation.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/site/contact" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#5CD9A0] text-[#0C1210] text-sm font-semibold hover:bg-[#38C588] ll-lift">
                Découvrir Starkk <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/site/formations" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/20 text-white text-sm font-semibold hover:bg-white/5 transition-colors">
                Nos formations
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/50">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#5CD9A0]" /> Déjà au travail dans nos équipes</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#5CD9A0]" /> Bientôt dans vos espaces</span>
            </div>
          </div>
          <div className="lg:col-span-6 ll-rise" style={{ animationDelay: '0.12s' }}>
            <StarkkHero />
          </div>
        </div>
      </section>

      {/* ── CE QU'IL FAIT ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="max-w-2xl">
          <Kicker className="mb-4">Ce que Starkk sait faire</Kicker>
          <h2 className="ll-display ll-fluid-h2 text-[#14110F] text-balance">Un assistant qui connaît vraiment votre formation</h2>
          <p className="mt-4 text-lg text-[#57534E]">
            Starkk n’est pas un chatbot générique : il est branché sur la plateforme de gestion de Lab Learning
            et travaille sur vos données réelles, en toute confidentialité.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPACITES.map((c, i) => (
            <Reveal key={c.t} delay={(i % 3) * 80}>
              <div className="group h-full rounded-2xl border border-[#205040]/10 bg-white p-6 hover:shadow-lg hover:shadow-black/5 hover:border-[#205040]/25 ll-lift">
                <span className="h-11 w-11 rounded-xl bg-[#205040]/8 flex items-center justify-center mb-4 group-hover:bg-[#205040] transition-colors">
                  <c.Icon className="h-5 w-5 text-[#205040] group-hover:text-white transition-colors" />
                </span>
                <div className="font-heading font-semibold text-[#14110F]">{c.t}</div>
                <p className="mt-1.5 text-sm text-[#57534E] leading-relaxed">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── POUR QUI ── */}
      <section className="bg-[#FAFAFA] border-y border-[#205040]/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <Kicker className="mb-4">Pour qui</Kicker>
            <h2 className="ll-display ll-fluid-h2 text-[#14110F] text-balance">Un même assistant, trois espaces</h2>
            <p className="mt-4 text-lg text-[#57534E]">
              Starkk assiste déjà nos équipes au quotidien. Il arrive progressivement dans les espaces
              de nos clients, de nos formateurs et de nos apprenants.
            </p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PUBLICS.map((p, i) => (
              <Reveal key={p.badge} delay={(i % 3) * 90} className="h-full">
                <div className="h-full flex flex-col rounded-3xl overflow-hidden bg-white ring-1 ring-black/5 hover:ring-[#205040]/25 hover:shadow-xl hover:shadow-black/5 ll-lift">
                  <div className="px-6 pt-6 pb-5 text-white" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
                    <span className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center mb-4"><p.Icon className="h-5 w-5 text-white" /></span>
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/70">{p.badge}</div>
                    <div className="mt-1 font-heading font-bold text-lg leading-snug">{p.titre}</div>
                  </div>
                  <ul className="p-6 space-y-3 flex-1">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5 text-sm text-[#57534E] leading-relaxed">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[#205040]" /> {pt}
                      </li>
                    ))}
                  </ul>
                  <div className="px-6 pb-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#205040]/8 px-3 py-1 text-xs font-semibold text-[#205040]">
                      <Sparkles className="h-3 w-3" /> Bientôt disponible
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="max-w-2xl">
          <Kicker className="mb-4">Comment ça marche</Kicker>
          <h2 className="ll-display ll-fluid-h2 text-[#14110F] text-balance">Vous demandez, il prépare, vous validez</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ETAPES.map((e, i) => (
            <Reveal key={e.n} delay={(i % 3) * 90}>
              <div className="h-full rounded-3xl bg-white ring-1 ring-black/5 p-7">
                <div className="ll-display text-4xl text-[#205040]/25">{e.n}</div>
                <div className="mt-4 font-heading font-semibold text-[#14110F]">{e.t}</div>
                <p className="mt-2 text-sm text-[#57534E] leading-relaxed">{e.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-10 flex items-start gap-4 rounded-2xl border border-[#205040]/15 bg-[#205040]/4 p-6">
            <span className="h-10 w-10 shrink-0 rounded-xl bg-[#205040]/10 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-[#205040]" /></span>
            <div>
              <div className="font-heading font-semibold text-[#14110F]">Le principe non négociable : l’humain décide</div>
              <p className="mt-1 text-sm text-[#57534E] leading-relaxed">
                Starkk ne prend aucune décision seul. Chaque envoi, chaque modification, chaque document passe par
                une confirmation humaine. Vos données restent dans votre espace Lab Learning et ne servent qu’à vous répondre.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20 md:pb-24">
        <Reveal>
          <div className="rounded-[32px] bg-[#14110F] text-white px-6 md:px-16 py-16 md:py-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 -z-0 opacity-70" style={{ background: 'radial-gradient(600px 300px at 20% 0%, rgba(56,197,136,0.35), transparent 60%), radial-gradient(500px 260px at 100% 100%, rgba(99,102,241,0.35), transparent 55%)' }} />
            <div className="relative">
              <Kicker tone="light" center className="mb-5 justify-center">L’IA au service du geste juste</Kicker>
              <h2 className="ll-display ll-fluid-h1 text-balance max-w-3xl mx-auto text-white">Une formation suivie par des humains, épaulés par Starkk</h2>
              <p className="mt-4 text-white/70 max-w-xl mx-auto text-lg">
                Nos conseillers restent vos interlocuteurs. Starkk leur apporte des réponses
                immédiates et un suivi sans faille. Bientôt, il vous les apportera aussi.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/site/contact" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#14110F] text-sm font-semibold hover:bg-[#F6F4EF] ll-lift">
                  Parler à un conseiller <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/site/formations" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/25 text-white text-sm font-semibold hover:bg-white/5 transition-colors">
                  Voir nos formations
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
