import Link from 'next/link'
import { ArrowRight, Banknote, Building2, Briefcase, TrendingUp, FileCheck2, PhoneCall, CalendarCheck, GraduationCap, DoorOpen } from '../icons'
import { Kicker } from '../Kicker'
import { Reveal } from '../Reveal'

export const metadata = { title: 'Financements — Lab Learning' }

const DISPOSITIFS = [
  {
    Icon: DoorOpen,
    t: 'POEI — avant l’ouverture',
    d: "La Préparation Opérationnelle à l’Emploi Individuelle finance la formation de vos futurs salariés avant leur prise de poste. Idéale à l’ouverture : vous recrutez et formez une équipe déjà opérationnelle, financée par France Travail.",
    tag: 'Recrutement',
  },
  {
    Icon: Building2,
    t: 'OPCO',
    d: "Les Opérateurs de Compétences financent tout ou partie de la formation de vos salariés au titre du plan de développement des compétences ou de dispositifs dédiés à votre branche.",
    tag: 'Salariés',
  },
  {
    Icon: Briefcase,
    t: 'France Travail',
    d: "Pour les demandeurs d’emploi, des dispositifs comme l’AIF ou la POEI permettent de financer une montée en compétence vers un poste concret.",
    tag: 'Demandeurs d’emploi',
  },
  {
    Icon: TrendingUp,
    t: 'Plan de développement des compétences',
    d: "L’employeur mobilise son budget formation pour faire monter ses équipes en compétence — un levier de fidélisation et de performance en cuisine comme en salle.",
    tag: 'Employeurs',
  },
]

const ETAPES = [
  { Icon: PhoneCall, t: 'On échange sur votre besoin', d: 'Un premier point pour cadrer les objectifs, le public et le calendrier.' },
  { Icon: FileCheck2, t: 'On monte le dossier', d: 'Programme, devis et convention conformes Qualiopi, prêts pour votre financeur.' },
  { Icon: CalendarCheck, t: 'On planifie la session', d: 'Dates, formateur et logistique calés avec vos contraintes d’exploitation.' },
  { Icon: GraduationCap, t: 'On forme et on certifie', d: 'Évaluation des acquis et attestation en fin de parcours.' },
]

export default function SiteFinancements() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 ll-grid-faint" />
        <div className="max-w-4xl mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-12">
          <Kicker className="mb-5"><Banknote className="h-4 w-4" /> Financements</Kicker>
          <h1 className="ll-display ll-fluid-hero text-[#14110F] text-balance">
            Vos formations, <span className="text-[#195144]">financées</span>.
          </h1>
          <p className="mt-7 text-lg md:text-xl text-[#57534E] leading-relaxed max-w-2xl">
            De l’ouverture avec la POEI à la formation continue de vos équipes, nos formations sont éligibles
            aux principaux dispositifs. On vous accompagne de bout en bout dans le montage du dossier.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DISPOSITIFS.map((x, i) => (
            <Reveal key={x.t} delay={(i % 4) * 80}>
            <div className="group h-full rounded-2xl border border-[#195144]/10 bg-white p-6 flex flex-col hover:shadow-lg hover:shadow-black/5 hover:border-[#195144]/25 ll-lift">
              <div className="flex items-center justify-between mb-4">
                <span className="h-11 w-11 rounded-xl bg-[#195144]/8 flex items-center justify-center group-hover:bg-[#195144] transition-colors"><x.Icon className="h-5 w-5 text-[#195144] group-hover:text-white transition-colors" /></span>
                <span className="text-xs font-semibold text-[#195144] bg-[#195144]/8 rounded-full px-2.5 py-1">{x.tag}</span>
              </div>
              <div className="font-heading font-semibold text-lg text-[#14110F]">{x.t}</div>
              <p className="mt-1.5 text-sm text-[#57534E] leading-relaxed flex-1">{x.d}</p>
            </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        <Kicker className="mb-4">Le parcours</Kicker>
        <h2 className="ll-display ll-fluid-h2 text-[#14110F] mb-10">Comment ça se passe</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {ETAPES.map((e, i) => (
            <Reveal key={e.t} delay={(i % 4) * 80}>
            <div className="relative h-full rounded-2xl border border-[#195144]/10 bg-white p-6 overflow-hidden hover:border-[#195144]/25 ll-lift">
              <div className="ll-index absolute -right-2 -top-3 text-7xl text-[#195144]/[0.07] select-none">0{i + 1}</div>
              <e.Icon className="h-6 w-6 text-[#195144]" />
              <div className="mt-4 font-heading font-semibold text-[#14110F] leading-snug">{e.t}</div>
              <p className="mt-1.5 text-sm text-[#57534E] leading-relaxed">{e.d}</p>
            </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="rounded-[28px] bg-[#195144] text-white px-6 md:px-14 py-14 md:flex items-center justify-between gap-8">
          <div>
            <h2 className="ll-display text-2xl md:text-4xl text-balance text-white">On monte votre dossier de financement</h2>
            <p className="mt-3 text-white/70 max-w-xl">Dites-nous qui former et pour quel objectif — on s’occupe du reste.</p>
          </div>
          <Link href="/site/contact" className="mt-6 md:mt-0 shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#195144] text-sm font-semibold hover:bg-[#F6F4EF] transition-colors">
            Étudier mon financement <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
