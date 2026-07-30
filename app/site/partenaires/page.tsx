import Link from 'next/link'
import { ArrowRight, Building2, MapPin, Network, Store } from '../icons'
import { getPublicPartners } from '@/lib/public-site-data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Partenaires — Lab Learning' }

export default async function SitePartenaires() {
  const partners = await getPublicPartners()
  const totalReseaux = partners.length
  const totalEtab = partners.reduce((s, p) => s + (p.nombre_etablissements || p.etablissements_accompagnes || 0), 0)

  return (
    <>
      <section className="max-w-4xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-3">Ils nous font confiance</div>
        <h1 className="font-heading font-black text-4xl md:text-6xl text-[#14110F] tracking-heading text-balance">
          Des <span className="text-[#195144]">réseaux franchisés</span> nous confient leurs équipes.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-[#57534E] leading-relaxed max-w-2xl">
          Enseignes nationales et réseaux multi-sites : nous déployons des parcours homogènes à l’échelle
          de dizaines d’établissements, avec un pilotage centralisé et un formateur au plus près du terrain.
        </p>
        {totalReseaux > 0 && (
          <div className="mt-8 flex flex-wrap gap-6">
            <div className="flex items-center gap-2.5">
              <span className="h-10 w-10 rounded-xl bg-[#195144]/8 flex items-center justify-center"><Network className="h-5 w-5 text-[#195144]" /></span>
              <span><span className="block font-heading font-black text-2xl text-[#14110F] tabular-nums">{totalReseaux}</span><span className="text-sm text-[#78716C]">réseaux partenaires</span></span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-10 w-10 rounded-xl bg-[#195144]/8 flex items-center justify-center"><Store className="h-5 w-5 text-[#195144]" /></span>
              <span><span className="block font-heading font-black text-2xl text-[#14110F] tabular-nums">{totalEtab.toLocaleString('fr-FR')}</span><span className="text-sm text-[#78716C]">établissements couverts</span></span>
            </div>
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        {partners.length === 0 ? (
          <div className="rounded-2xl border border-[#195144]/10 bg-white p-10 text-center text-[#78716C]">Nos partenariats seront présentés ici prochainement.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => (
              <div key={p.nom} className="rounded-2xl border border-[#195144]/10 bg-white p-6 flex flex-col">
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
            ))}
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="rounded-3xl bg-[#195144] text-white px-6 md:px-12 py-12 md:flex items-center justify-between gap-8">
          <div>
            <h2 className="font-heading font-bold text-2xl md:text-3xl tracking-heading">Vous pilotez un réseau ?</h2>
            <p className="mt-2 text-white/70 max-w-xl">Déployons un plan de formation homogène sur l’ensemble de vos établissements.</p>
          </div>
          <Link href="/site/contact" className="mt-6 md:mt-0 shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#195144] text-sm font-semibold hover:bg-[#F6F4EF] transition-colors">
            Devenir partenaire <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
