import { Store } from './icons'

export interface MarqueeItem { nom: string; logo_url?: string | null; nombre_etablissements?: number | null }

/**
 * Bandeau défilant de logos franchises (preuve). Piste dupliquée pour une
 * boucle continue ; se met en pause au survol. Animation gérée en CSS
 * (respecte prefers-reduced-motion — voir globals.css).
 */
export function Marquee({ items }: { items: MarqueeItem[] }) {
  if (!items.length) return null
  const loop = [...items, ...items]
  return (
    <div className="ll-marquee-mask overflow-hidden">
      <div className="ll-marquee-track gap-3 py-1">
        {loop.map((f, i) => (
          <div
            key={`${f.nom}-${i}`}
            aria-hidden={i >= items.length}
            className="shrink-0 w-52 h-24 rounded-2xl border border-[#195144]/10 bg-white flex flex-col items-center justify-center gap-1.5 px-5"
          >
            {f.logo_url ? (
              <img src={f.logo_url} alt={f.nom} className="h-9 w-auto max-w-[130px] object-contain grayscale opacity-70" />
            ) : (
              <span className="inline-flex items-center gap-2 font-heading font-semibold text-[#44403C] text-sm text-center">
                <Store className="h-4 w-4 text-[#195144]/60" /> {f.nom}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
