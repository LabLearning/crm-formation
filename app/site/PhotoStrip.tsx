/**
 * Bandeau photo défilant « sur le terrain » : les photos des formations en
 * boucle continue — même mécanique CSS que le Marquee des logos (pause au
 * survol, respecte prefers-reduced-motion).
 */
export function PhotoStrip({ photos, height = 'h-40 md:h-52' }: { photos: string[]; height?: string }) {
  if (!photos.length) return null
  const loop = [...photos, ...photos]
  return (
    <div className="ll-marquee-mask overflow-hidden">
      <div className="ll-marquee-track gap-4 py-1">
        {loop.map((src, i) => (
          <div key={`${src}-${i}`} aria-hidden={i >= photos.length}
            className={`shrink-0 ${height} aspect-[3/2] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-sm`}>
            <img loading="lazy" src={src} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  )
}
