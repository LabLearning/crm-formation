import Link from 'next/link'
import { ArrowRight, Building2, MapPin, Network } from '../icons'
import { getPublicPartners } from '@/lib/public-site-data'
import { Kicker } from '../Kicker'
import { Reveal } from '../Reveal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Clients & références — Lab Learning' }

// Enseignes clientes mises en avant en références (au-delà des réseaux franchisés).
const ENSEIGNES = [
  'Khadispal', 'Shake Beef', 'Tasty Crousty', 'Crousty One',
  'Sushi Corner', "Chez l'ancien", 'Big Smash',
]

export default async function SiteClients() {
  const partners = await getPublicPartners()
  const totalReseaux = partners.length

  return (
    <>
      <section className="relative overflow-hidden max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-10">
        <div className="absolute inset-0 -z-10 ll-grid-faint" />
        <Kicker className="mb-5">Ils nous font confiance</Kicker>
        <h1 className="ll-display ll-fluid-hero text-[#14110F] text-balance">
          Des <span className="text-[#205040]">enseignes de la restauration</span> nous confient leurs équipes.
        </h1>
        <p className="mt-7 text-lg md:text-xl text-[#57534E] leading-relaxed max-w-2xl">
          Restaurants, réseaux multi-sites et enseignes franchisées : nous formons leurs équipes avec des parcours
          adaptés au terrain, un pilotage clair et un formateur au plus près des équipes.
        </p>
      </section>

      {/* Mur de références — enseignes clientes */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ENSEIGNES.map((nom, i) => (
            <Reveal key={nom} delay={(i % 4) * 70}>
              <div className="h-24 rounded-2xl border border-[#205040]/10 bg-white flex items-center justify-center px-4 text-center hover:border-[#205040]/25 hover:shadow-sm ll-lift">
                <span className="font-heading font-semibold text-[#14110F] leading-tight">{nom}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Réseaux accompagnés */}
      {partners.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-[#205040]/8 flex items-center justify-center"><Network className="h-5 w-5 text-[#205040]" /></span>
            <div>
              <div className="ll-kicker">Réseaux accompagnés</div>
              <div className="text-sm text-[#78716C]">{totalReseaux} enseigne{totalReseaux > 1 ? 's' : ''} franchisée{totalReseaux > 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p, i) => (
              <Reveal key={p.nom} delay={(i % 3) * 80} className="h-full">
                <div className="h-full rounded-2xl border border-[#205040]/10 bg-white p-6 flex flex-col hover:shadow-lg hover:shadow-black/5 hover:border-[#205040]/25 ll-lift">
                  <div className="h-16 flex items-center">
                    {p.logo_url
                      ? <img src={p.logo_url} alt={p.nom} className="h-12 w-auto max-w-[150px] object-contain" />
                      : <span className="font-heading font-bold text-xl text-[#14110F]">{p.nom}</span>}
                  </div>
                  <div className="mt-4 font-heading font-semibold text-[#14110F]">{p.nom}</div>
                  <div className="mt-2 space-y-1.5 text-sm text-[#57534E] flex-1">
                    {p.secteur ? <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#205040]/60" />{p.secteur}</div> : null}
                    {(p.ville || p.zone_geographique) ? <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#205040]/60" />{p.zone_geographique || p.ville}</div> : null}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="rounded-[28px] bg-[#205040] text-white px-6 md:px-14 py-14 md:flex items-center justify-between gap-8">
          <div>
            <h2 className="ll-display text-2xl md:text-4xl text-balance text-white">Vous dirigez un restaurant ou un réseau ?</h2>
            <p className="mt-3 text-white/70 max-w-xl">Construisons ensemble le plan de formation de vos équipes — et montons le financement avec vous.</p>
          </div>
          <Link href="/site/contact" className="mt-6 md:mt-0 shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#205040] text-sm font-semibold hover:bg-[#F6F4EF] transition-colors">
            Parlons de vos équipes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
