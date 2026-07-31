import Link from 'next/link'
import { ArrowRight } from '../icons'
import { getBranchesData } from '@/lib/public-site-data'
import { BRANCHES } from '../branches'
import { MetierVisual } from '../MetierVisual'
import { Reveal } from '../Reveal'
import { Kicker } from '../Kicker'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nos formations par métier — Lab Learning' }

export default async function SiteFormations() {
  const data = await getBranchesData()
  const bySlug = new Map(data.map((d) => [d.slug, d]))

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 ll-grid-faint" />
        <div className="max-w-4xl mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-12">
          <Kicker className="mb-5">Nos formations</Kicker>
          <h1 className="ll-display ll-fluid-hero text-[#14110F] text-balance">
            Quel est <span className="text-[#195144]">votre métier</span> ?
          </h1>
          <p className="mt-7 text-lg md:text-xl text-[#57534E] leading-relaxed max-w-2xl">
            Choisissez votre activité : on vous montre les formations faites pour vous — cœur de métier,
            hygiène, sécurité et management — et à quel financement vous avez droit.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="grid gap-5 sm:grid-cols-2">
          {BRANCHES.map((b, i) => {
            const d = bySlug.get(b.slug)
            return (
              <Reveal key={b.slug} delay={(i % 2) * 90}>
                <Link href={`/site/branches/${b.slug}`} className="group block rounded-3xl overflow-hidden bg-white ring-1 ring-black/5 hover:ring-[#195144]/25 hover:shadow-lg ll-lift">
                  <MetierVisual nom={b.label} label={b.label} height="h-52 md:h-60" />
                  <div className="p-5 md:p-6 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-[#57534E]">{b.tagline}</div>
                      {d && <div className="text-xs text-[#A8A29E] mt-1">{d.total} formation{d.total > 1 ? 's' : ''} pour ce métier</div>}
                    </div>
                    <span className="shrink-0 h-10 w-10 rounded-full bg-[#195144]/8 flex items-center justify-center text-[#195144] group-hover:bg-[#195144] group-hover:text-white transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>

        <p className="mt-8 text-center text-sm text-[#78716C]">
          Vous ne trouvez pas votre secteur ? <Link href="/site/contact" className="font-semibold text-[#195144] hover:underline">Parlons-en</Link> — on construit du sur-mesure.
        </p>
      </section>
    </>
  )
}
