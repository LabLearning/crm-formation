import Link from 'next/link'
import { ArrowRight, Banknote, CheckCircle2, FileCheck2, PhoneCall, GraduationCap } from '../icons'
import { Kicker } from '../Kicker'
import { Reveal } from '../Reveal'

export const metadata = {
  title: 'Financements',
  description:
    'POEI, OPCO, AIF, CPF, AGEFICE : les dispositifs qui financent vos formations, du recrutement à la formation continue. On monte le dossier avec vous de A à Z.',
  alternates: { canonical: '/financements' },
}

/**
 * Les types de financement possibles — une carte par dispositif, avec le logo
 * officiel du financeur et les points concrets de prise en charge. La première
 * carte (POEI) est mise en avant : c'est le dispositif signature de Lab Learning.
 */
const DISPOSITIFS: {
  t: string
  sous: string
  pourQui: string
  d: string
  points: string[]
  logos: { src: string; alt: string }[]
  photo: string
  href?: string
  cta?: string
}[] = [
  {
    t: 'POEI',
    sous: 'Préparation Opérationnelle à l’Emploi Individuelle',
    pourQui: 'Recrutement & ouverture',
    d: 'France Travail finance la formation de vos futurs salariés avant leur prise de poste. Idéale à l’ouverture : vous recrutez et formez une équipe déjà opérationnelle dès le premier jour.',
    points: ['Formation financée avant l’embauche', 'Recrutement + formation avant l’ouverture', 'Équipe opérationnelle dès le jour 1'],
    logos: [{ src: '/site/logos/financeurs/france-travail.svg', alt: 'France Travail' }],
    photo: '/site/metiers/rapide.webp',
  },
  {
    t: 'Plan de développement des compétences',
    sous: 'Votre OPCO de branche',
    pourQui: 'Salariés en poste',
    d: 'Votre opérateur de compétences finance tout ou partie de la formation de vos salariés : AKTO, OPCO EP, L’Opcommerce et les autres OPCO de branche. Nos tarifs sont calés sur leurs barèmes, le reste à charge est souvent nul.',
    points: ['AKTO, OPCO EP, L’Opcommerce et d’autres', 'Formations pendant l’exploitation', 'Reste à charge souvent nul'],
    logos: [
      { src: '/site/logos/financeurs/akto.png', alt: 'AKTO' },
      { src: '/site/logos/financeurs/opco-ep.svg', alt: 'OPCO EP' },
      { src: '/site/logos/financeurs/opcommerce.svg', alt: "L'Opcommerce" },
    ],
    photo: '/site/metiers/cuisine.webp',
  },
  {
    t: 'CPF',
    sous: 'Mon Compte Formation',
    pourQui: 'Individuel',
    d: 'Chaque actif dispose d’un budget formation attaché à son compte. Notre formation Création d’entreprise est éligible : le CPF finance tout ou partie du parcours.',
    points: ['Mobilisable par le salarié ou le demandeur d’emploi', 'Formation Création d’entreprise éligible'],
    logos: [{ src: '/site/logos/financeurs/mon-compte-formation.svg', alt: 'Mon Compte Formation' }],
    photo: '/site/metiers/management.webp',
    href: '/site/formations/d8bcc0e2-80de-4784-b4c8-5bb2e1bf72f8',
    cta: 'Voir la formation éligible',
  },
  {
    t: 'AGEFICE',
    sous: 'Dirigeants non salariés du commerce et des services',
    pourQui: 'Gérants & indépendants',
    d: 'Vous êtes gérant non salarié d’un restaurant, d’un commerce de bouche ? L’AGEFICE rembourse vos formations selon les barèmes en vigueur ; nous déposons le dossier auprès de votre Point d’Accueil.',
    points: ['Formations obligatoires et métier', 'Dossier déposé par nos soins', 'Remboursement selon les barèmes en vigueur'],
    logos: [{ src: '/site/logos/financeurs/agefice.png', alt: 'AGEFICE' }],
    photo: '/site/metiers/hcr.webp',
  },
]

const FINANCEURS = [
  { src: '/site/logos/financeurs/france-travail.svg', alt: 'France Travail' },
  { src: '/site/logos/financeurs/akto.png', alt: 'AKTO' },
  { src: '/site/logos/financeurs/opco-ep.svg', alt: 'OPCO EP' },
  { src: '/site/logos/financeurs/opcommerce.svg', alt: "L'Opcommerce" },
  { src: '/site/logos/financeurs/mon-compte-formation.svg', alt: 'Mon Compte Formation' },
  { src: '/site/logos/financeurs/agefice.png', alt: 'AGEFICE' },
]

/** Le parcours « zéro paperasse » : ce qu'on fait, dans l'ordre, à votre place. */
const PARCOURS = [
  { Icon: PhoneCall, t: 'On échange sur votre besoin', d: 'Objectifs, équipe à former, calendrier : un premier point suffit pour cadrer.' },
  { Icon: Banknote, t: 'On identifie le bon financeur', d: 'POEI, OPCO, AGEFICE ou CPF : on trouve le dispositif et le barème de votre branche.' },
  { Icon: FileCheck2, t: 'On prépare et on dépose le dossier', d: 'Programme, devis et convention conformes Qualiopi, déposés auprès du financeur.' },
  { Icon: GraduationCap, t: 'Vous formez, on suit jusqu’au paiement', d: 'Accord de prise en charge, session planifiée, facturation directement au financeur.' },
]

function PlaqueLogos({ logos }: { logos: { src: string; alt: string }[] }) {
  return (
    <div className="flex items-center gap-2">
      {logos.map((l) => (
        <span key={l.alt} className="inline-flex h-14 items-center rounded-xl bg-white ring-1 ring-black/10 shadow-sm px-3">
          <img src={l.src} alt={l.alt} title={l.alt} className="h-9 w-auto max-w-[120px] object-contain" />
        </span>
      ))}
    </div>
  )
}

export default function SiteFinancements() {
  const [poei, ...autres] = DISPOSITIFS
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 ll-grid-faint" />
        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-12">
          <Kicker className="mb-5"><Banknote className="h-4 w-4" /> Financements</Kicker>
          <h1 className="ll-display ll-fluid-hero text-[#14110F] text-balance">
            Vos formations, <span className="text-[#205040]">financées</span>.
          </h1>
          <p className="mt-7 text-lg md:text-xl text-[#57534E] leading-relaxed max-w-2xl">
            Du recrutement à la formation continue, il existe un dispositif pour chaque situation.
            On identifie le bon financeur et on monte le dossier avec vous, de A à Z.
          </p>
          {/* Le mur des financeurs : la preuve avant l'argumentaire */}
          <div className="mt-10 flex flex-wrap items-center gap-3">
            {FINANCEURS.map((l, i) => (
              <Reveal key={l.alt} delay={i * 70}>
                <span className="inline-flex h-16 items-center rounded-2xl bg-white ring-1 ring-black/5 shadow-sm px-5 hover:ring-[#205040]/25 hover:shadow-md transition-all">
                  <img src={l.src} alt={l.alt} title={l.alt} className="h-10 w-auto max-w-[140px] object-contain" />
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Les types de financement possibles ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        <Kicker className="mb-4">Les dispositifs</Kicker>
        <h2 className="ll-display ll-fluid-h2 text-[#14110F] mb-10">Les types de financement possibles</h2>

        {/* POEI en vedette : carte horizontale pleine largeur */}
        <Reveal>
          <div className="group rounded-3xl border border-[#205040]/10 bg-white overflow-hidden grid md:grid-cols-2 hover:shadow-xl hover:shadow-black/10 hover:border-[#205040]/25 transition-all duration-300">
            <div className="relative h-52 md:h-auto overflow-hidden order-first md:order-last">
              <img src={poei.photo} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/25 via-transparent to-transparent" />
            </div>
            <div className="p-6 md:p-10 flex flex-col">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <PlaqueLogos logos={poei.logos} />
                <span className="text-xs font-semibold text-[#205040] bg-[#205040]/8 rounded-full px-3 py-1.5">{poei.pourQui}</span>
              </div>
              <div className="mt-5 font-heading font-bold text-2xl text-[#14110F]">{poei.t}</div>
              <div className="mt-0.5 text-sm font-semibold text-[#22A972]">{poei.sous}</div>
              <p className="mt-3 text-[#57534E] leading-relaxed">{poei.d}</p>
              <ul className="mt-4 space-y-2">
                {poei.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-[#44403C]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#205040]" /> {p}
                  </li>
                ))}
              </ul>
              <Link href="/site/contact" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#205040] hover:gap-2.5 transition-all">
                Monter ce dossier <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Les autres dispositifs : cartes « mini-page » avec couverture + logo */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {autres.map((x, i) => (
            <Reveal key={x.t} delay={(i % 2) * 110} className="h-full">
              <div className="group h-full rounded-3xl border border-[#205040]/10 bg-white overflow-hidden flex flex-col hover:shadow-xl hover:shadow-black/10 hover:border-[#205040]/25 hover:-translate-y-1.5 transition-all duration-300">
                <div className="relative h-36 overflow-hidden">
                  <img src={x.photo} alt="" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  <span className="absolute top-3 right-3 text-xs font-semibold text-[#205040] bg-white/95 rounded-full px-3 py-1.5 shadow-sm">{x.pourQui}</span>
                </div>
                <div className="px-6 relative z-10 -mt-7">
                  <PlaqueLogos logos={x.logos} />
                </div>
                <div className="px-6 pt-4 pb-6 flex flex-col flex-1">
                  <div className="font-heading font-bold text-lg text-[#14110F]">{x.t}</div>
                  <div className="mt-0.5 text-xs font-semibold text-[#22A972]">{x.sous}</div>
                  <p className="mt-2.5 text-sm text-[#57534E] leading-relaxed">{x.d}</p>
                  <ul className="mt-3 space-y-1.5 flex-1">
                    {x.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-[#44403C]">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#205040]" /> {p}
                      </li>
                    ))}
                  </ul>
                  <Link href={x.href || '/site/contact'} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#205040] hover:gap-2.5 transition-all">
                    {x.cta || 'Monter ce dossier'} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Zéro paperasse : le parcours animé, étape après étape ── */}
      <section className="bg-[#FAFAFA] border-y border-[#205040]/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20 grid lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-5">
            <Kicker className="mb-4">Zéro paperasse pour vous</Kicker>
            <h2 className="ll-display ll-fluid-h2 text-[#14110F] text-balance">On monte le dossier de A à Z</h2>
            <p className="mt-4 text-[#57534E] leading-relaxed">
              Le montage du financement, c&apos;est notre travail, pas le vôtre. Voilà comment ça se passe,
              dans l&apos;ordre : vous nous parlez de vos équipes, on s&apos;occupe de tout le reste.
            </p>
            <Link href="/site/contact" className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#205040] text-white text-sm font-semibold hover:bg-[#123f34] ll-lift">
              Lancer la première étape <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {/* Timeline verticale : chaque étape se révèle en cascade, la ligne se dessine avec elle */}
          <div className="lg:col-span-7">
            {PARCOURS.map((e, i) => (
              <Reveal key={e.t} delay={i * 180}>
                <div className="group relative flex gap-5 pb-2">
                  {/* Rail : pastille icône + segment de ligne qui se dessine */}
                  <div className="flex flex-col items-center">
                    <span className="relative z-10 h-12 w-12 shrink-0 rounded-2xl bg-white ring-1 ring-[#205040]/15 shadow-sm flex items-center justify-center text-[#205040] transition-all duration-300 group-hover:bg-[#205040] group-hover:text-white group-hover:scale-110 group-hover:rotate-3">
                      <e.Icon className="h-5 w-5" />
                    </span>
                    {i < PARCOURS.length - 1 && (
                      <span className="ll-step-line w-px flex-1 my-1 bg-gradient-to-b from-[#38C588] to-[#205040]/20" style={{ transitionDelay: `${i * 180 + 220}ms` }} />
                    )}
                  </div>
                  <div className={i < PARCOURS.length - 1 ? 'pb-8' : ''}>
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-heading font-black text-sm text-[#38C588] tabular-nums">0{i + 1}</span>
                      <span className="font-heading font-semibold text-lg text-[#14110F]">{e.t}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-[#57534E] leading-relaxed max-w-md">{e.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <div className="rounded-[28px] bg-[#205040] text-white px-6 md:px-14 py-14 md:flex items-center justify-between gap-8">
          <div>
            <h2 className="ll-display text-2xl md:text-4xl text-balance text-white">On monte votre dossier de financement</h2>
            <p className="mt-3 text-white/70 max-w-xl">Dites-nous qui former et pour quel objectif : on s’occupe du reste.</p>
          </div>
          <Link href="/site/contact" className="mt-6 md:mt-0 shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#205040] text-sm font-semibold hover:bg-[#F6F4EF] transition-colors">
            Étudier mon financement <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
