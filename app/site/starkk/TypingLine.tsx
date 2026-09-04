'use client'

// Ligne de commande du héro : les demandes se tapent en boucle avec un curseur.
import { useEffect, useState } from 'react'

const DEMANDES = [
  'envoie-moi ma convention signée',
  'où en est la session de mardi ?',
  'relance les questionnaires de satisfaction',
  'explique-lui la question 7 du quiz',
  'quand arrive mon attestation ?',
]

export function TypingLine() {
  const [texte, setTexte] = useState('')
  const [i, setI] = useState(0)
  const [efface, setEfface] = useState(false)

  useEffect(() => {
    const cible = DEMANDES[i % DEMANDES.length]
    let t: ReturnType<typeof setTimeout>
    if (!efface) {
      if (texte.length < cible.length) t = setTimeout(() => setTexte(cible.slice(0, texte.length + 1)), 55)
      else t = setTimeout(() => setEfface(true), 1800)
    } else {
      if (texte.length > 0) t = setTimeout(() => setTexte(texte.slice(0, -1)), 22)
      else { setEfface(false); setI((v) => v + 1) }
    }
    return () => clearTimeout(t)
  }, [texte, efface, i])

  return (
    <div className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-white/[0.06] ring-1 ring-white/12 px-5 py-3.5 font-mono text-sm md:text-[15px]">
      <span className="h-2 w-2 rounded-full bg-[#5CD9A0] animate-pulse shrink-0" />
      <span className="text-white/50 shrink-0">Starkk,</span>
      <span className="text-white whitespace-nowrap overflow-hidden">{texte}<span className="inline-block w-[9px] h-[1.1em] align-text-bottom bg-[#5CD9A0] ml-0.5 animate-pulse" /></span>
    </div>
  )
}
