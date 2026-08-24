'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CLE = 'll_cookies_choix'

/**
 * Bandeau cookies RGPD : le choix est mémorisé en localStorage et le bandeau
 * ne revient plus. Le site n'embarque aujourd'hui que des cookies strictement
 * nécessaires — le consentement stocké servira de porte d'entrée si des
 * outils de mesure d'audience sont ajoutés plus tard.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(CLE)) setVisible(true)
    } catch { /* stockage indisponible : pas de bandeau en boucle */ }
  }, [])

  function choisir(valeur: 'accepte' | 'refuse') {
    try { localStorage.setItem(CLE, valeur) } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div role="dialog" aria-label="Gestion des cookies"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-5">
      <div className="max-w-3xl mx-auto rounded-2xl bg-[#14110F] text-white shadow-2xl shadow-black/30 ring-1 ring-white/10 p-5 sm:flex sm:items-center sm:gap-6">
        <p className="text-sm text-white/80 leading-relaxed flex-1">
          Ce site utilise des cookies strictement nécessaires à son fonctionnement et, si vous l&apos;acceptez,
          des mesures d&apos;audience anonymes.{' '}
          <Link href="/site/cookies" className="underline underline-offset-2 text-white hover:text-white/80">
            En savoir plus
          </Link>
        </p>
        <div className="mt-4 sm:mt-0 flex items-center gap-2 shrink-0">
          <button onClick={() => choisir('refuse')}
            className="px-4 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-colors">
            Continuer sans accepter
          </button>
          <button onClick={() => choisir('accepte')}
            className="px-5 py-2 rounded-full bg-white text-[#14110F] text-sm font-semibold hover:bg-[#F6F4EF] transition-colors">
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
