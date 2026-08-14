'use client'

import { useState } from 'react'
import { deposerReclamationPubliqueAction } from './actions'

const CHAMP = 'w-full rounded-xl border border-[#195144]/15 bg-white px-4 py-3 text-sm text-[#14110F] placeholder-[#A8A29E] focus:border-[#195144] focus:outline-none focus:ring-2 focus:ring-[#195144]/10'

export function ReclamationForm() {
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [numero, setNumero] = useState<string | null>(null)
  const [depose, setDepose] = useState(false)

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErreur(null)
    setEnvoi(true)
    const r = await deposerReclamationPubliqueAction(new FormData(e.currentTarget))
    setEnvoi(false)
    if (r.success) {
      setNumero(r.data?.numero || null)
      setDepose(true)
    } else {
      setErreur(r.error || 'Une erreur est survenue.')
    }
  }

  if (depose) {
    return (
      <div className="rounded-3xl border border-[#195144]/10 bg-[#F4FAF7] p-8 text-center">
        <div className="font-heading text-xl font-bold text-[#14110F]">Réclamation bien reçue</div>
        <p className="mt-2 text-sm text-[#57534E] leading-relaxed">
          {numero ? <>Votre réclamation est enregistrée sous la référence <strong>{numero}</strong>. </> : null}
          Un accusé de réception vient de vous être adressé par email. Nous analysons chaque
          réclamation et vous tiendrons informé(e) des suites données.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      {/* Champ invisible pour les humains : les robots le remplissent. */}
      <input type="text" name="entreprise_site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rec-nom" className="mb-1.5 block text-sm font-medium text-[#14110F]">Nom et prénom *</label>
          <input id="rec-nom" name="nom" required className={CHAMP} placeholder="Votre nom" />
        </div>
        <div>
          <label htmlFor="rec-email" className="mb-1.5 block text-sm font-medium text-[#14110F]">Email *</label>
          <input id="rec-email" name="email" type="email" required className={CHAMP} placeholder="vous@exemple.fr" />
        </div>
        <div>
          <label htmlFor="rec-tel" className="mb-1.5 block text-sm font-medium text-[#14110F]">Téléphone</label>
          <input id="rec-tel" name="telephone" type="tel" className={CHAMP} placeholder="06 12 34 56 78" />
        </div>
        <div>
          <label htmlFor="rec-origine" className="mb-1.5 block text-sm font-medium text-[#14110F]">Vous êtes *</label>
          <select id="rec-origine" name="origine" required className={CHAMP} defaultValue="apprenant">
            <option value="apprenant">Stagiaire / apprenant</option>
            <option value="entreprise">Entreprise cliente</option>
            <option value="financeur">Financeur (OPCO, France Travail…)</option>
            <option value="autre">Autre</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="rec-objet" className="mb-1.5 block text-sm font-medium text-[#14110F]">Objet *</label>
        <input id="rec-objet" name="objet" required className={CHAMP} placeholder="En quelques mots" />
      </div>

      <div>
        <label htmlFor="rec-desc" className="mb-1.5 block text-sm font-medium text-[#14110F]">Votre réclamation *</label>
        <textarea id="rec-desc" name="description" required rows={6} className={CHAMP}
          placeholder="Décrivez les faits : formation concernée, dates, ce qui n'a pas répondu à vos attentes." />
      </div>

      {erreur && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</div>
      )}

      <button type="submit" disabled={envoi}
        className="w-full rounded-full bg-[#195144] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#123f34] disabled:opacity-60">
        {envoi ? 'Envoi en cours…' : 'Déposer ma réclamation'}
      </button>
      <p className="text-xs text-[#A8A29E] leading-relaxed">
        Vos coordonnées ne sont utilisées que pour le traitement de votre réclamation, conformément à
        notre politique de confidentialité. Un accusé de réception vous est adressé immédiatement.
      </p>
    </form>
  )
}
