import Link from 'next/link'
import { ArrowRight, Building2, MapPin, Network, Store } from '../icons'
import { getPublicPartners } from '@/lib/public-site-data'
import { Kicker } from '../Kicker'
import { Reveal } from '../Reveal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Partenaires — Lab Learning' }

export default async function SitePartenaires() {
  const partners = await getPublicPartners()
  const totalReseaux = partners.length
  const totalEtab = partners.reduce((s, p) => s + (p.nombre_etablissements || p.etablissements_accompagnes || 0), 0)

  return (
    <>
      <section className="relative overflow-hidden max-w-4xl mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-10">
        <div className="absolute inset-0 -z-10 ll-grid-faint" />
        <Kicker className="mb-5">Ils nous font confiance</Kicker>
        <h1 className="ll-display ll-fluid-hero text-[#14110F] text-balance">
          Des <span className="text-[#195144]">réseaux franchisés</span> nous confient leurs équipes.
        </h1>
        <p className="mt-7 text-lg md:text-xl text-[#57534E] leading-relaxed max-w-2xl">
          Enseignes nationales et réseaux multi-sites : nous déployons des parcours homogènes à l’échelle
          de dizaines d’établissements, avec un pilotage centralisé et un formateur au plus près du terrain.
        </p>
        {totalReseaux > 0 && (
          <div className="mt-9 flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
              <span className="h-11 w-11 rounded-xl bg-[#195144]/8 flex items-center justify-center"><Network className="h-5 w-5 text-[#195144]" /></span>
              <span><span className="block ll-display text-3xl text-[#14110F]">{totalReseaux}</span><span className="text-sm text-[#78716C]">réseaux partenaires</span></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-11 w-11 rounded-xl bg-[#195144]/8 flex items-center justify-center"><Store className="h-5 w-5 text-[#195144]" /></span>
              <span><span className="block ll-display text-3xl text-[#14110F]">{totalEtab.toLocaleString('fr-FR')}</span><span className="text-sm text-[#78716C]">établissements couverts</span></span>
            </div>
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        {partners.length === 0 ? (
          <div className="rounded-2xl border border-[#195144]/10 bg-white p-10 text-center text-[#78716C]">Nos partenariats seront présentés ici prochainement.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p, i) => (
              <Reveal key={p.nom} delay={(i % 3) * 80} className="h-full">
              <div className="h-full rounded-2xl border border-[#195144]/10 bg-white p-6 flex flex-col hover:shadow-lg hover:shadow-black/5 hover:border-[#195144]/25 ll-lift">
                <div className="h-16 flex items-center">
                  {p.logo_url
                    ? <img src={p.logo_url} alt={p.nom} className="h-12 w-auto max-w-[150px] object-contain" />
                    : <span className="font-heading font-bold text-xl text-[#14110F]">{p.nom}</span>}
                </div>
                <div className="mt-4 font-heading font-semibold text-[#14110F]">{p.nom}</div>
                <div className="mt-2 space-y-1.5 text-sm text-[#57534E] flex-1">
                  {p.secteur ? <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#195144]/60" />{p.secteur}</div> : null}
                  {(p.ville || p.zone_geographique) ? <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#195144]/60" />{p.zone_geographique || p.ville}</div> : null}
                  {p.nombre_etablissements ? <div className="flex items-center gap-2"><Store className="h-4 w-4 text-[#195144]/60" />{p.nombre_etablissements} établissements</div> : null}
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="rounded-[28px] bg-[#195144] text-white px-6 md:px-14 py-14 md:flex items-center justify-between gap-8">
          <div>
            <h2 className="ll-display text-2xl md:text-4xl text-balance text-white">Vous pilotez un réseau ?</h2>
            <p className="mt-3 text-white/70 max-w-xl">Déployons un plan de formation homogène sur l’ensemble de vos établissements.</p>
          </div>
          <Link href="/site/contact" className="mt-6 md:mt-0 shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#195144] text-sm font-semibold hover:bg-[#F6F4EF] transition-colors">
            Devenir partenaire <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
