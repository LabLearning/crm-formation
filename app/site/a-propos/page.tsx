import Link from 'next/link'
import { ArrowRight, ShieldCheck, Target, HeartHandshake, Award, MapPin } from '../icons'
import { getPublicSiteData } from '@/lib/public-site-data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'À propos — Lab Learning' }

const VALEURS = [
  { Icon: Target, t: 'Le geste juste', d: "Une pédagogie ancrée dans le réel du métier : on apprend en faisant, sur les gestes qui comptent en production." },
  { Icon: HeartHandshake, t: 'Proximité', d: "Des formateurs praticiens qui interviennent au plus près de vos équipes et de vos contraintes d'exploitation." },
  { Icon: Award, t: 'Exigence', d: "Des parcours structurés, évalués et certifiés Qualiopi, pensés pour une montée en compétence durable." },
]

export default async function SiteAPropos() {
  const { stats } = await getPublicSiteData()
  const chiffres = [
    { v: stats.formations, l: 'Formations au catalogue' },
    { v: stats.apprenants, l: 'Apprenants formés' },
    { v: stats.sessionsRealisees, l: 'Sessions réalisées' },
    { v: stats.entreprises, l: 'Entreprises accompagnées' },
  ]

  return (
    <>
      <section className="max-w-4xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-3">Qui sommes-nous</div>
        <h1 className="font-heading font-black text-4xl md:text-6xl text-[#14110F] tracking-heading text-balance">
          Former les métiers de bouche à <span className="text-[#195144]">l’excellence du geste</span>.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-[#57534E] leading-relaxed max-w-2xl">
          Lab Learning est un organisme de formation professionnelle certifié Qualiopi, spécialiste
          de la restauration, de la boucherie, de la boulangerie, de la pâtisserie et de l’hôtellerie.
          Notre conviction : la compétence se transmet sur le terrain, par des praticiens, au rythme des équipes.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-14">
        <div className="rounded-3xl bg-[#195144] text-white px-6 md:px-12 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {chiffres.map((c) => (
            <div key={c.l}>
              <div className="font-heading font-black text-3xl md:text-5xl tracking-heading tabular-nums">{c.v}</div>
              <div className="mt-1 text-sm text-white/70">{c.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        <h2 className="font-heading font-bold text-2xl md:text-3xl text-[#14110F] tracking-heading mb-8">Ce qui nous guide</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {VALEURS.map((v) => (
            <div key={v.t} className="rounded-2xl border border-[#195144]/10 bg-white p-6">
              <span className="h-11 w-11 rounded-xl bg-[#195144]/8 flex items-center justify-center mb-4"><v.Icon className="h-5 w-5 text-[#195144]" /></span>
              <div className="font-heading font-semibold text-lg text-[#14110F]">{v.t}</div>
              <p className="mt-1.5 text-sm text-[#57534E] leading-relaxed">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-[#195144]/10 bg-white p-8">
            <ShieldCheck className="h-7 w-7 text-[#195144]" />
            <div className="mt-3 font-heading font-bold text-xl text-[#14110F] tracking-heading">Certifiés Qualiopi</div>
            <p className="mt-2 text-[#57534E] leading-relaxed">
              La certification Qualiopi atteste de la qualité de nos processus, de l’analyse du besoin
              à l’évaluation des acquis. C’est aussi la condition d’accès aux financements publics et mutualisés.
            </p>
          </div>
          <div className="rounded-3xl border border-[#195144]/10 bg-white p-8">
            <MapPin className="h-7 w-7 text-[#195144]" />
            <div className="mt-3 font-heading font-bold text-xl text-[#14110F] tracking-heading">Sur tout le territoire</div>
            <p className="mt-2 text-[#57534E] leading-relaxed">
              Nous intervenons en présentiel dans vos établissements comme à distance, et accompagnons
              aussi bien l’indépendant que les réseaux et franchises multi-sites.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="rounded-3xl bg-[#14110F] text-white px-6 md:px-12 py-12 text-center">
          <h2 className="font-heading font-bold text-2xl md:text-3xl tracking-heading">Travaillons ensemble</h2>
          <p className="mt-2 text-white/60 max-w-xl mx-auto">Parlez-nous de vos équipes et de vos objectifs — on construit le parcours.</p>
          <Link href="/site/contact" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#14110F] text-sm font-semibold hover:bg-[#F6F4EF] transition-colors">
            Nous contacter <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
