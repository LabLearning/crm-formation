import { Star, Award, MapPin } from 'lucide-react'
import { getPublicTeam } from '@/lib/public-site-data'

export const dynamic = 'force-dynamic'

function initials(p: string, n: string) {
  return `${(p[0] || '').toUpperCase()}${(n[0] || '').toUpperCase()}`
}

export default async function SiteEquipe() {
  const team = await getPublicTeam()

  return (
    <>
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-2">Notre équipe</div>
        <h1 className="font-heading font-black text-4xl md:text-5xl text-[#14110F] tracking-heading text-balance max-w-3xl">
          Des formateurs de terrain
        </h1>
        <p className="mt-4 text-lg text-[#57534E] max-w-2xl">
          {team.length} formateurs experts, chacun spécialiste de son métier, engagés pour transmettre le geste juste
          et l'exigence du secteur.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        {team.length === 0 ? (
          <div className="text-center py-16 text-[#78716C]">L'équipe sera présentée prochainement.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((f) => (
              <div key={f.id} className="rounded-2xl border border-[#195144]/10 bg-white p-6">
                <div className="flex items-center gap-4">
                  {f.photo_url
                    ? <img src={f.photo_url} alt={`${f.prenom} ${f.nom}`} className="h-16 w-16 rounded-2xl object-cover shrink-0" />
                    : <div className="h-16 w-16 rounded-2xl bg-[#195144]/10 flex items-center justify-center font-heading font-bold text-[#195144] text-lg shrink-0">{initials(f.prenom, f.nom)}</div>}
                  <div className="min-w-0">
                    <div className="font-heading font-semibold text-[#14110F]">{f.prenom} {f.nom}</div>
                    {f.note_moyenne != null && (
                      <div className="flex items-center gap-1 text-sm text-[#57534E] mt-0.5">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> {f.note_moyenne.toFixed(1)}/5
                      </div>
                    )}
                    {f.zone_intervention && <div className="flex items-center gap-1 text-xs text-[#A8A29E] mt-0.5"><MapPin className="h-3 w-3" />{f.zone_intervention}</div>}
                  </div>
                </div>
                {f.domaines_expertise.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {f.domaines_expertise.slice(0, 4).map((d) => (
                      <span key={d} className="px-2.5 py-1 rounded-full bg-[#195144]/8 text-[#195144] text-xs font-medium">{d}</span>
                    ))}
                  </div>
                )}
                {f.certifications.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {f.certifications.slice(0, 3).map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 text-xs text-[#78716C]"><Award className="h-3 w-3 text-[#195144]" />{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
