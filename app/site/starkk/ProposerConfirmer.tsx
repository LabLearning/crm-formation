'use client'

// Séquence animée du principe proposer-confirmer : déclenchée quand la
// section entre dans le viewport, rejouable. Les 3 étapes s'allument au
// rythme de l'animation de la carte.
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ArrowRight } from '../icons'

const ETAPES = [
  { n: '01', t: 'Vous demandez', d: 'En langage naturel, comme à un collègue.' },
  { n: '02', t: 'Starkk prépare', d: 'Il consulte votre dossier et vous propose une action prête à partir.' },
  { n: '03', t: 'Vous validez', d: 'Rien ne part sans vous : un clic pour confirmer, et c’est exécuté.' },
]

// phase : 0 repos, 1 demande, 2 proposition, 3 clic en cours, 4 fait
export function ProposerConfirmer() {
  const [phase, setPhase] = useState(0)
  const conteneur = useRef<HTMLDivElement>(null)
  const lance = useRef(false)

  const jouer = () => {
    setPhase(0)
    const temps: [number, number][] = [[400, 1], [1600, 2], [3400, 3], [4200, 4]]
    for (const [delai, p] of temps) setTimeout(() => setPhase(p), delai)
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase(4)
      lance.current = true
      return
    }
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !lance.current) { lance.current = true; jouer() }
    }, { threshold: 0.35 })
    if (conteneur.current) obs.observe(conteneur.current)
    return () => obs.disconnect()
  }, [])

  const etapeActive = phase === 0 ? -1 : phase === 1 ? 0 : phase === 2 ? 1 : 2

  return (
    <div ref={conteneur} className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-center">
      {/* Les 3 étapes, qui s'allument */}
      <div className="space-y-3">
        {ETAPES.map((e, i) => (
          <div key={e.n} className={`flex items-start gap-4 rounded-2xl p-5 transition-all duration-500 ${i === etapeActive ? 'bg-white ring-1 ring-[#205040]/25 shadow-lg shadow-black/5' : 'bg-white/50 ring-1 ring-black/5 opacity-60'}`}>
            <div className={`ll-display text-3xl transition-colors duration-500 ${i <= etapeActive ? 'text-[#205040]' : 'text-[#205040]/20'}`}>{e.n}</div>
            <div>
              <div className="font-heading font-semibold text-[#14110F]">{e.t}</div>
              <p className="mt-1 text-sm text-[#57534E] leading-relaxed">{e.d}</p>
            </div>
            {i < etapeActive + (phase >= 4 ? 1 : 0) && <CheckCircle2 className="h-5 w-5 text-[#205040] ml-auto shrink-0 mt-1" />}
          </div>
        ))}
        <button onClick={jouer} className="ml-1 mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#205040] hover:gap-2.5 transition-all">
          Rejouer l’animation <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* La conversation qui se joue */}
      <div className="rounded-[28px] bg-[#0C1210] p-6 md:p-8 min-h-[320px] flex flex-col justify-center gap-4 shadow-2xl shadow-black/20">
        {/* 1. La demande */}
        <div className={`flex justify-end transition-all duration-500 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <div className="rounded-2xl rounded-br-md bg-[#5CD9A0] text-[#0C1210] text-sm px-4 py-2.5 font-medium">
            Relance les émargements manquants de la session de mardi
          </div>
        </div>

        {/* 2. La proposition */}
        <div className={`flex items-start gap-2.5 transition-all duration-500 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <img src="/starkk.png" alt="" className="h-7 w-7 rounded-full object-cover mt-0.5 shrink-0" />
          <div className="rounded-2xl bg-white/[0.07] ring-1 ring-[#5CD9A0]/30 p-4 max-w-[320px]">
            <div className="text-[13px] font-semibold text-white">Relancer 2 signatures d’émargement</div>
            <ul className="mt-2 space-y-1 text-[12px] text-white/55">
              <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 mt-[1px] shrink-0 text-[#5CD9A0]" /> Session Hygiène alimentaire de mardi</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 mt-[1px] shrink-0 text-[#5CD9A0]" /> Un lien de signature par stagiaire concerné</li>
            </ul>
            {phase >= 4 ? (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#5CD9A0]/15 px-3 py-1.5 text-xs font-semibold text-[#5CD9A0] ll-rise">
                <CheckCircle2 className="h-3.5 w-3.5" /> Fait. 2 relances envoyées.
              </div>
            ) : (
              <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#5CD9A0] text-[#0C1210] px-4 py-1.5 text-xs font-semibold transition-transform duration-200 ${phase === 3 ? 'scale-90 ring-4 ring-[#5CD9A0]/30' : ''}`}>
                Confirmer l’envoi
              </span>
            )}
          </div>
        </div>

        {/* Légende de phase */}
        <div className="text-center text-[11px] uppercase tracking-wide text-white/30 mt-2">
          {phase < 1 ? 'Démonstration' : phase < 2 ? 'Vous demandez' : phase < 3 ? 'Starkk prépare' : phase < 4 ? 'Vous validez' : 'Exécuté, tracé, terminé'}
        </div>
      </div>
    </div>
  )
}
