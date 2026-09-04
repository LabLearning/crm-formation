import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, Sparkles, AiChat, AiSecurity,
  UserCheck, Building2, GraduationCap, Calendar, FileCheck2, Clock, ShieldCheck,
} from '../icons'
import { StarkkHero } from './StarkkHero'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Starkk, notre intelligence artificielle',
  description:
    "Starkk est l'assistant IA de Lab Learning : il renseigne clients, formateurs et apprenants sur leur espace, retrouve leurs documents, explique et relance. Vous demandez, il s'en occupe.",
  alternates: { canonical: '/starkk' },
}

const CAPACITES = [
  { Icon: AiChat, t: 'Renseigne sur votre compte', d: 'Où en est ma session ? Quand arrive mon attestation ? Qui est mon formateur ? Starkk répond immédiatement, à partir des informations de votre espace.' },
  { Icon: FileCheck2, t: 'Remet le bon document', d: 'Convention, convocation, attestation, certificat de réalisation : chacun retrouve ses documents en une demande, sans fouiller ses emails.' },
  { Icon: GraduationCap, t: 'Aide à comprendre', d: 'Une question de quiz ratée ? Starkk reprend la notion avec l’apprenant, explique la bonne réponse et vérifie qu’elle est comprise.' },
  { Icon: Calendar, t: 'Relance à votre place', d: 'Questionnaires de satisfaction non répondus, émargements en attente, signatures manquantes : Starkk propose les relances, vous validez, il s’en charge.' },
  { Icon: Clock, t: 'Disponible en continu', d: 'Le soir après le service ou le dimanche matin : Starkk répond quand vous travaillez, pas seulement aux heures de bureau.' },
  { Icon: AiSecurity, t: 'Jamais sans votre accord', d: 'Starkk propose, vous confirmez. Aucun envoi, aucune modification sans validation. Chacun n’accède qu’aux informations de son propre espace.' },
]

const PUBLICS = [
  {
    Icon: Building2, badge: 'Clients et gérants', titre: 'Votre espace, sans les allers-retours',
    points: [
      'L’état de votre compte en une question : sessions, conventions, factures, financement OPCO',
      'Les documents de vos salariés remis instantanément',
      'Les démarches en cours suivies et relancées au bon moment',
    ],
    from: '#0F766E', to: '#5CD9A0',
  },
  {
    Icon: UserCheck, badge: 'Formateurs', titre: 'Tout votre niveau d’information, sans chercher',
    points: [
      'Vos documents et les infos de vos interventions : planning, lieux, effectifs, grilles',
      'Un appui pédagogique : il aide un apprenant à comprendre une question où il a répondu faux',
      'Les questionnaires de satisfaction et les émargements relancés pour vous',
    ],
    from: '#155E4F', to: '#38C588',
  },
  {
    Icon: GraduationCap, badge: 'Apprenants', titre: 'Un accompagnement à portée de main',
    points: [
      'Vos convocations, horaires, lieux et attestations en une demande',
      'Une explication claire quand une question de quiz vous a échappé',
      'Une réponse simple à chaque question sur votre parcours',
    ],
    from: '#1C4536', to: '#2AA271',
  },
]

const ETAPES = [
  { n: '01', t: 'Vous demandez', d: 'En langage naturel, comme à un collègue : « envoie-moi ma convention », « où en est la session de mardi ? »' },
  { n: '02', t: 'Starkk prépare', d: 'Il consulte votre dossier, rassemble les éléments et vous propose une réponse ou une action prête à partir.' },
  { n: '03', t: 'Vous validez', d: 'Rien ne part sans vous : chaque action est confirmée d’un clic avant d’être exécutée.' },
]

const kicker = (label: string) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-[#5CD9A0]/10 ring-1 ring-[#5CD9A0]/25 px-3.5 py-1.5 text-xs font-semibold tracking-wide uppercase text-[#5CD9A0]">
    <Sparkles className="h-3.5 w-3.5" /> {label}
  </span>
)

export default function SiteStarkk() {
  return (
    <div className="bg-[#0C1210] text-white">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-0 opacity-80" style={{ background: 'radial-gradient(900px 500px at 15% -10%, rgba(92,217,160,0.20), transparent 60%), radial-gradient(700px 400px at 100% 10%, rgba(56,197,136,0.12), transparent 55%)' }} />
        <div className="relative max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-16 md:pb-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 ll-rise">
            {kicker('Notre intelligence artificielle')}
            <h1 className="mt-6 ll-display ll-fluid-hero text-white text-balance">
              Voici <span className="italic inline-block bg-gradient-to-r from-[#5CD9A0] to-[#38C588] bg-clip-text text-transparent px-2 -mx-2 pb-3 -mb-3">Starkk</span>.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/70 max-w-xl leading-relaxed">
              L’assistant IA de Lab Learning simplifie votre espace au maximum : une information sur
              votre compte, un document, une explication, une relance. Vous demandez, il s’en occupe.
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
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#5CD9A0]" /> Pour nos clients, formateurs et apprenants</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#5CD9A0]" /> Directement dans votre espace</span>
            </div>
          </div>
          <div className="lg:col-span-6 ll-rise" style={{ animationDelay: '0.12s' }}>
            <StarkkHero />
          </div>
        </div>
      </section>

      {/* ── CE QU'IL FAIT ── */}
      <section className="relative border-t border-white/8">
        <div className="absolute inset-0 -z-0 opacity-60" style={{ background: 'radial-gradient(700px 400px at 85% 0%, rgba(92,217,160,0.08), transparent 55%)' }} />
        <div className="relative max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            {kicker('Ce que Starkk sait faire')}
            <h2 className="mt-5 ll-display ll-fluid-h2 text-white text-balance">Il simplifie tout ce qui vous fait perdre du temps</h2>
            <p className="mt-4 text-lg text-white/60">
              Starkk n’est pas un chatbot générique : il est branché sur votre espace Lab Learning
              et répond à partir de vos informations réelles, en toute confidentialité.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPACITES.map((c) => (
              <div key={c.t} className="group h-full rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-6 hover:ring-[#5CD9A0]/40 hover:bg-white/[0.06] hover:shadow-[0_0_40px_-12px_rgba(92,217,160,0.35)] transition-all">
                <span className="h-11 w-11 rounded-xl bg-[#5CD9A0]/10 ring-1 ring-[#5CD9A0]/20 flex items-center justify-center mb-4 group-hover:bg-[#5CD9A0] transition-colors">
                  <c.Icon className="h-5 w-5 text-[#5CD9A0] group-hover:text-[#0C1210] transition-colors" />
                </span>
                <div className="font-heading font-semibold text-white">{c.t}</div>
                <p className="mt-1.5 text-sm text-white/60 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POUR QUI ── */}
      <section className="border-t border-white/8 bg-[#0F1613]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            {kicker('Pour qui')}
            <h2 className="mt-5 ll-display ll-fluid-h2 text-white text-balance">Un même assistant, trois espaces</h2>
            <p className="mt-4 text-lg text-white/60">
              Client, formateur ou apprenant : chacun a son espace, et Starkk y répond avec
              le bon niveau d’information. Il aide chacun là où il en a besoin.
            </p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PUBLICS.map((p) => (
              <div key={p.badge} className="h-full flex flex-col rounded-3xl overflow-hidden bg-white/[0.04] ring-1 ring-white/10 hover:ring-[#5CD9A0]/40 hover:shadow-[0_0_50px_-15px_rgba(92,217,160,0.4)] transition-all">
                <div className="px-6 pt-6 pb-5 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-25" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }} />
                  <div className="relative">
                    <span className="h-10 w-10 rounded-xl bg-[#5CD9A0]/12 ring-1 ring-[#5CD9A0]/25 flex items-center justify-center mb-4"><p.Icon className="h-5 w-5 text-[#5CD9A0]" /></span>
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#5CD9A0]">{p.badge}</div>
                    <div className="mt-1 font-heading font-bold text-lg leading-snug text-white">{p.titre}</div>
                  </div>
                </div>
                <ul className="p-6 space-y-3 flex-1">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm text-white/65 leading-relaxed">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[#5CD9A0]" /> {pt}
                    </li>
                  ))}
                </ul>
                <div className="px-6 pb-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5CD9A0]/10 ring-1 ring-[#5CD9A0]/20 px-3 py-1 text-xs font-semibold text-[#5CD9A0]">
                    <Sparkles className="h-3 w-3" /> Bientôt disponible
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="relative border-t border-white/8">
        <div className="absolute inset-0 -z-0 opacity-60" style={{ background: 'radial-gradient(700px 400px at 10% 100%, rgba(92,217,160,0.08), transparent 55%)' }} />
        <div className="relative max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            {kicker('Comment ça marche')}
            <h2 className="mt-5 ll-display ll-fluid-h2 text-white text-balance">Vous demandez, il prépare, vous validez</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {ETAPES.map((e) => (
              <div key={e.n} className="h-full rounded-3xl bg-white/[0.04] ring-1 ring-white/10 p-7">
                <div className="ll-display text-4xl bg-gradient-to-r from-[#5CD9A0] to-[#38C588] bg-clip-text text-transparent">{e.n}</div>
                <div className="mt-4 font-heading font-semibold text-white">{e.t}</div>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{e.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-start gap-4 rounded-2xl ring-1 ring-[#5CD9A0]/25 bg-[#5CD9A0]/6 p-6">
            <span className="h-10 w-10 shrink-0 rounded-xl bg-[#5CD9A0]/12 ring-1 ring-[#5CD9A0]/25 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-[#5CD9A0]" /></span>
            <div>
              <div className="font-heading font-semibold text-white">Le principe non négociable : l’humain décide</div>
              <p className="mt-1 text-sm text-white/60 leading-relaxed">
                Starkk ne prend aucune décision seul. Chaque envoi, chaque modification, chaque document passe par
                une confirmation humaine. Vos données restent dans votre espace Lab Learning et ne servent qu’à vous répondre.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/8">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-24">
          <div className="rounded-[32px] ring-1 ring-[#5CD9A0]/25 px-6 md:px-16 py-16 md:py-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 -z-0 opacity-80" style={{ background: 'radial-gradient(600px 300px at 20% 0%, rgba(92,217,160,0.18), transparent 60%), radial-gradient(500px 260px at 100% 100%, rgba(56,197,136,0.14), transparent 55%)' }} />
            <div className="relative">
              {kicker('L’IA au service du geste juste')}
              <h2 className="mt-6 ll-display ll-fluid-h1 text-balance max-w-3xl mx-auto text-white">Une formation suivie par des humains, épaulés par Starkk</h2>
              <p className="mt-4 text-white/60 max-w-xl mx-auto text-lg">
                Nos conseillers restent vos interlocuteurs. Starkk leur apporte des réponses
                immédiates et un suivi sans faille. Bientôt, il vous les apportera aussi.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/site/contact" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#5CD9A0] text-[#0C1210] text-sm font-semibold hover:bg-[#38C588] ll-lift">
                  Parler à un conseiller <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/site/formations" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/25 text-white text-sm font-semibold hover:bg-white/5 transition-colors">
                  Voir nos formations
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
