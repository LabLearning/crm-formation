'use client'

import { EVT_GERER_COOKIES } from '../CookieBanner'

/** Rouvre le bandeau de consentement — le mécanisme de retrait exigé par le RGPD. */
export function GererCookies() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event(EVT_GERER_COOKIES))}
      className="inline-block rounded-full bg-[#205040] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#123f34] transition-colors">
      Modifier mon choix
    </button>
  )
}
