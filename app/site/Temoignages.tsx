import { Star } from './icons'

export interface Temoignage {
  note: number
  commentaire: string
  nom: string
  fonction: string | null
  entreprise: string | null
}

/**
 * Témoignages clients : verbatims réels du registre d'appréciations Qualiopi.
 * Trois cartes, note étoilée, citation, signature — rien d'inventé.
 */
export function Temoignages({ items }: { items: Temoignage[] }) {
  if (items.length < 2) return null
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {items.slice(0, 3).map((t, i) => (
        <figure key={i} className="h-full rounded-3xl bg-white ring-1 ring-black/5 p-6 md:p-7 flex flex-col hover:shadow-lg hover:shadow-black/5 ll-lift">
          <div className="flex items-center gap-1 text-[#F59E0B]">
            {Array.from({ length: 5 }, (_, s) => (
              <Star key={s} className={`h-4 w-4 ${s < t.note ? '' : 'opacity-25'}`} />
            ))}
          </div>
          <blockquote className="mt-4 text-[15px] text-[#44403C] leading-relaxed flex-1">
            « {t.commentaire} »
          </blockquote>
          <figcaption className="mt-5 pt-4 border-t border-[#F0EEE9]">
            <div className="font-heading font-semibold text-sm text-[#14110F]">{t.nom}</div>
            <div className="text-xs text-[#78716C] mt-0.5">
              {[t.fonction, t.entreprise].filter(Boolean).join(' · ')}
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
