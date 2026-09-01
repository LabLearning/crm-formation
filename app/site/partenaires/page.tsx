import Link from 'next/link'
import { ArrowRight, HeartHandshake, Building2 } from '../icons'
import { Kicker } from '../Kicker'
import { Reveal } from '../Reveal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Clients & partenaires — Lab Learning' }

// ── Partenaires : les réseaux franchisés accompagnés dans la durée ──
const PARTENAIRES: { nom: string; logo: string; desc: string }[] = [
  { nom: "Dream's Donuts", logo: '/site/logos/partenaires/dreams-donuts.png', desc: 'Réseau national — ouvertures et montée en compétence des équipes' },
  { nom: 'New School Tacos', logo: '/site/logos/partenaires/new-school-tacos.svg', desc: 'Formation des équipiers et référentiels de marque' },
  { nom: 'Chamas Tacos', logo: '/site/logos/partenaires/chamas-tacos.png', desc: 'Hygiène, HACCP et standards de production du réseau' },
  { nom: 'Chickeez', logo: '/site/logos/partenaires/chickeez.png', desc: 'POEI de recrutement et parcours équipier polyvalent' },
  { nom: 'Kassia Food', logo: '/site/logos/partenaires/kassia-food.png', desc: 'Accompagnement des établissements du réseau' },
]

// ── Clients : enseignes et restaurants formés ──
// `pleine` : le logo embarque son propre fond de marque → la tuile est l'image
const CLIENTS: { nom: string; logo?: string; pleine?: boolean }[] = [
  { nom: 'La Kazdalerie', logo: '/site/logos/clients/la-kazdalerie.png' },
  { nom: 'Chicken Street', logo: '/site/logos/partenaires/chicken-street.png' },
  { nom: 'Croust Wok', logo: '/site/logos/partenaires/croust-wok.webp' },
  { nom: 'Khadispal', logo: '/site/logos/clients/khadispal.png' },
  { nom: 'Shake Beef', logo: '/site/logos/clients/shake-beef.png' },
  { nom: 'Tasty Crousty', logo: '/site/logos/clients/tasty-crousty.png', pleine: true },
  { nom: 'Crousty One', logo: '/site/logos/clients/crousty-one.png' },
  { nom: 'Sushi Corner', logo: '/site/logos/clients/sushi-corner.png' },
  { nom: "Chez l'ancien", logo: '/site/logos/clients/chez-lancien.png' },
  { nom: 'Big Smash', logo: '/site/logos/clients/big-smash.jpg', pleine: true },
]

export default function SiteClients() {
  return (
    <>
      <section className="relative overflow-hidden max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-10">
        <div className="absolute inset-0 -z-10 ll-grid-faint" />
        <Kicker className="mb-5">Ils nous font confiance</Kicker>
        <h1 className="ll-display ll-fluid-hero text-[#14110F] text-balance">
          Nos <span className="text-[#205040]">clients</span> et nos{' '}
          <span className="italic inline-block bg-gradient-to-r from-[#205040] to-[#38C588] bg-clip-text text-transparent px-2 -mx-2 pb-3 -mb-3">partenaires</span>.
        </h1>
        <p className="mt-7 text-lg md:text-xl text-[#57534E] leading-relaxed max-w-2xl">
          Des réseaux franchisés qui nous confient leurs ouvertures et leurs équipes dans la durée,
          et des dizaines de restaurants formés partout en France.
        </p>
      </section>

      {/* ── Partenaires — les réseaux ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        <div className="mb-6 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-[#205040]/8 flex items-center justify-center"><HeartHandshake className="h-5 w-5 text-[#205040]" /></span>
          <div>
            <div className="ll-kicker">Partenaires</div>
            <div className="text-sm text-[#78716C]">Les réseaux que nous accompagnons dans la durée</div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PARTENAIRES.map((p, i) => (
            <Reveal key={p.nom} delay={(i % 3) * 80} className="h-full">
              <div className="h-full rounded-2xl border border-[#205040]/10 bg-white p-6 flex flex-col hover:shadow-lg hover:shadow-black/5 hover:border-[#205040]/25 ll-lift">
                <div className="h-20 flex items-center">
                  <img src={p.logo} alt={p.nom} className="h-16 w-auto max-w-[170px] object-contain" />
                </div>
                <div className="mt-4 font-heading font-semibold text-lg text-[#14110F]">{p.nom}</div>
                <p className="mt-1.5 text-sm text-[#57534E] flex-1">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Clients — le mur d'enseignes ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        <div className="mb-6 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-[#205040]/8 flex items-center justify-center"><Building2 className="h-5 w-5 text-[#205040]" /></span>
          <div>
            <div className="ll-kicker">Clients</div>
            <div className="text-sm text-[#78716C]">Restaurants et enseignes qui forment leurs équipes avec nous</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CLIENTS.map((c, i) => (
            <Reveal key={c.nom} delay={(i % 5) * 60}>
              <div className={`h-28 rounded-2xl border border-[#205040]/10 overflow-hidden flex items-center justify-center hover:border-[#205040]/25 hover:shadow-sm ll-lift ${c.pleine ? 'bg-transparent p-0' : 'bg-white px-4 text-center'}`}>
                {c.logo
                  ? <img src={c.logo} alt={c.nom} title={c.nom} className={c.pleine ? 'h-full w-full object-cover' : 'max-h-16 w-auto max-w-[130px] object-contain'} />
                  : <span className="font-heading font-semibold text-[#14110F] leading-tight">{c.nom}</span>}
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-5 text-sm text-[#78716C]">
          … et plus de 200 établissements formés : restauration rapide, boucherie, boulangerie, pâtisserie, hôtellerie.
        </p>
      </section>

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
