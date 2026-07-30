import Link from 'next/link'
import { Clock, Monitor, ArrowRight, CheckCircle2 } from 'lucide-react'
import { getPublicSiteData } from '@/lib/public-site-data'

export const dynamic = 'force-dynamic'

const MODALITE: Record<string, string> = { presentiel: 'Présentiel', distanciel: 'À distance', mixte: 'Mixte' }

export default async function SiteFormations() {
  const { categories, stats } = await getPublicSiteData()

  return (
    <>
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-2">Catalogue</div>
        <h1 className="font-heading font-black text-4xl md:text-5xl text-[#14110F] tracking-heading text-balance max-w-3xl">Nos formations</h1>
        <p className="mt-4 text-lg text-[#57534E] max-w-2xl">
          {stats.formations} programmes professionnels, du CAP au perfectionnement métier, éligibles aux financements OPCO.
          Catalogue mis à jour en continu.
        </p>
      </section>

      <div className="max-w-6xl mx-auto px-5 md:px-8 pb-20 space-y-14">
        {categories.map((cat) => (
          <section key={cat.nom}>
            <div className="flex items-baseline justify-between gap-4 border-b border-[#195144]/10 pb-3 mb-6">
              <h2 className="font-heading font-bold text-xl md:text-2xl text-[#14110F] tracking-heading">{cat.nom}</h2>
              <span className="text-sm text-[#A8A29E] shrink-0">{cat.formations.length} formation{cat.formations.length > 1 ? 's' : ''}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cat.formations.map((f) => (
                <Link key={f.id} href={`/site/formations/${f.id}`} className="group rounded-2xl border border-[#195144]/10 bg-white p-5 flex flex-col hover:border-[#195144]/30 hover:shadow-sm transition-all">
                  <div className="font-heading font-semibold text-[#14110F] leading-snug group-hover:text-[#195144] transition-colors">{f.intitule}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#78716C]">
                    {f.duree_heures ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{f.duree_heures} h</span> : null}
                    {f.modalite ? <span className="inline-flex items-center gap-1"><Monitor className="h-3.5 w-3.5" />{MODALITE[f.modalite] || f.modalite}</span> : null}
                  </div>
                  {f.objectifs.length > 0 && (
                    <ul className="mt-4 space-y-1.5 flex-1">
                      {f.objectifs.slice(0, 3).map((o, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#57534E]">
                          <CheckCircle2 className="h-4 w-4 text-[#195144] shrink-0 mt-0.5" /><span className="line-clamp-2">{o}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#195144] group-hover:gap-2.5 transition-all">
                    Voir le programme <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="rounded-3xl bg-[#195144] text-white px-6 md:px-12 py-12 text-center">
          <h2 className="font-heading font-bold text-2xl md:text-3xl tracking-heading">Une formation sur mesure ?</h2>
          <p className="mt-2 text-white/70 max-w-xl mx-auto">Nous adaptons nos programmes à votre établissement et à vos équipes.</p>
          <Link href="/site/contact" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#195144] text-sm font-semibold hover:bg-[#F6F4EF] transition-colors">
            Construire mon parcours <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
