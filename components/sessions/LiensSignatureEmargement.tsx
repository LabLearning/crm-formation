'use client'

import { useState } from 'react'
import { PenLine, Copy, Check, Send, Loader2, Mail } from '@/components/ui/icons'
import { Modal, useToast } from '@/components/ui'
import { liensSignatureEmargementsAction, envoyerLienEmargementAction } from '@/app/dashboard/sessions/[id]/actions'

interface Lien { apprenant_id: string; nom: string; email: string | null; url: string }

/**
 * Liens de signature d'émargement : chaque stagiaire signe ses créneaux sur
 * son portail. Le bouton génère les liens (token portail créé au besoin) ;
 * chaque ligne se copie ou s'envoie par email (tracé dans email_logs).
 */
export function LiensSignatureEmargement({ sessionId }: { sessionId: string }) {
  const { toast } = useToast()
  const [ouvert, setOuvert] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [liens, setLiens] = useState<Lien[]>([])
  const [copie, setCopie] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [envoyes, setEnvoyes] = useState<Set<string>>(new Set())

  async function ouvrir() {
    setOuvert(true)
    if (liens.length || chargement) return
    setChargement(true)
    const r = await liensSignatureEmargementsAction(sessionId)
    setChargement(false)
    if (r.success && r.data) setLiens(r.data.liens)
    else toast('error', r.error || 'Génération impossible')
  }

  async function copier(l: Lien) {
    await navigator.clipboard.writeText(l.url)
    setCopie(l.apprenant_id)
    setTimeout(() => setCopie(null), 1800)
  }

  async function envoyer(l: Lien) {
    setEnvoi(l.apprenant_id)
    const r = await envoyerLienEmargementAction(sessionId, l.apprenant_id)
    setEnvoi(null)
    if (r.success) { setEnvoyes((prev) => new Set(prev).add(l.apprenant_id)); toast('success', `Lien envoyé à ${l.email}`) }
    else toast('error', r.error || 'Envoi impossible')
  }

  return (
    <>
      <button onClick={ouvrir}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors">
        <PenLine className="h-3.5 w-3.5" /> Liens de signature
      </button>

      <Modal isOpen={ouvert} onClose={() => setOuvert(false)} title="Signature des émargements" size="md">
        <div className="space-y-3">
          <p className="text-sm text-surface-600">
            Chaque stagiaire signe ses propres créneaux depuis son lien personnel
            (téléphone ou ordinateur). Copiez le lien ou envoyez-le par email.
          </p>
          {chargement ? (
            <div className="py-8 text-center text-sm text-surface-400 inline-flex w-full justify-center items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Génération des liens…
            </div>
          ) : (
            <div className="divide-y divide-surface-100 rounded-xl border border-surface-100">
              {liens.map((l) => (
                <div key={l.apprenant_id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-900">{l.nom}</div>
                    <div className="text-[11px] text-surface-400 truncate">{l.email || 'sans email : copiez le lien'}</div>
                  </div>
                  <button onClick={() => copier(l)} title="Copier le lien de signature"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-surface-200 text-xs font-medium text-surface-700 hover:bg-surface-50 shrink-0">
                    {copie === l.apprenant_id ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copié</> : <><Copy className="h-3.5 w-3.5" /> Copier</>}
                  </button>
                  <button onClick={() => envoyer(l)} disabled={!l.email || envoi === l.apprenant_id}
                    title={l.email ? `Envoyer le lien à ${l.email}` : 'Aucune adresse email sur la fiche apprenant'}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                    {envoi === l.apprenant_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : envoyes.has(l.apprenant_id) ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                    {envoyes.has(l.apprenant_id) ? 'Envoyé' : 'Envoyer'}
                  </button>
                </div>
              ))}
              {liens.length === 0 && <div className="py-6 text-center text-sm text-surface-400">Aucun inscrit</div>}
            </div>
          )}
          <p className="text-[11px] text-surface-400 inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Les envois sont tracés dans l&apos;onglet Mails de la session.
          </p>
        </div>
      </Modal>
    </>
  )
}
