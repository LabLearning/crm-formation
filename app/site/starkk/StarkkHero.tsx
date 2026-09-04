// Visuel héro de la page Starkk : la boucle hologrammes tourne en vitrine.
import { AiChat } from '../icons'

export function StarkkHero() {
  return (
    <div className="relative max-w-md mx-auto">
      <div className="relative rounded-[32px] overflow-hidden ring-1 ring-white/15 shadow-2xl shadow-black/40 aspect-square bg-[#0C1210]">
        <video
          src="/starkk-hologramme.mp4"
          autoPlay
          loop
          muted
          playsInline
          poster="/starkk.png"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Bulle de conversation flottante */}
      <div className="hidden sm:flex absolute -left-8 top-8 items-center gap-2.5 rounded-2xl bg-white shadow-lg shadow-black/20 px-4 py-3 max-w-[230px]">
        <span className="h-8 w-8 shrink-0 rounded-lg bg-[#205040]/10 flex items-center justify-center"><AiChat className="h-4 w-4 text-[#205040]" /></span>
        <span className="text-xs text-[#14110F] leading-snug">« Starkk, envoie-moi l’attestation de la session de mardi »</span>
      </div>
      <div className="hidden sm:block absolute -right-6 bottom-16 rounded-2xl bg-white shadow-lg shadow-black/20 px-4 py-3 max-w-[210px]">
        <span className="text-xs text-[#14110F] leading-snug">« La voici. J’ai aussi noté deux émargements en attente, je vous prépare les liens ? »</span>
      </div>
    </div>
  )
}
