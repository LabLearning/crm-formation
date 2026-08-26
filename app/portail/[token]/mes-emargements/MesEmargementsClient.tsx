'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, CheckSquare, Clock, PenTool } from '@/components/ui/icons'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui'
import { SignaturePad } from '../emargement/SignaturePad'
import { signerMonEmargementAction } from './actions'

const CRENEAU: Record<string, string> = { matin: 'Matin', apres_midi: 'Après-midi', journee: 'Journée' }

interface Ligne {
  id: string
  date: string
  creneau: string
  est_present: boolean | null
  motif_absence: string | null
  signe: boolean
  signable: boolean
}

interface GroupeSession {
  sessionId: string
  titre: string
  lignes: Ligne[]
}

/**
 * Émargements de l'apprenant : consultation + signature directe des créneaux
 * passés non signés — le stagiaire émarge lui-même depuis son espace.
 */
export function MesEmargementsClient({ token, groupes }: { token: string; groupes: GroupeSession[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [signature, setSignature] = useState<{ id: string; libelle: string } | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function signer(base64: string) {
    if (!signature) return
    setEnCours(true)
    const r = await signerMonEmargementAction(token, signature.id, base64)
    setEnCours(false)
    if (r.success) { toast('success', 'Émargement signé'); setSignature(null); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-heading font-bold text-surface-900">Mes émargements</h1>
        <p className="text-sm text-surface-500 mt-1">
          Votre présence en formation, demi-journée par demi-journée. Les créneaux passés non signés
          peuvent être signés directement ici.
        </p>
      </div>

      {groupes.length === 0 && (
        <div className="card p-10 text-center text-sm text-surface-500">Aucun émargement pour le moment.</div>
      )}

      {groupes.map((g) => {
        const faits = g.lignes.filter((l) => l.est_present !== null)
        const presents = faits.filter((l) => l.est_present).length
        return (
          <div key={g.sessionId} className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-3">
              <CheckSquare className="h-4 w-4 text-brand-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-heading font-semibold text-surface-900 truncate">{g.titre}</div>
              </div>
              <span className={`text-xs font-semibold tabular-nums shrink-0 ${presents === faits.length ? 'text-emerald-600' : 'text-amber-600'}`}>
                {presents}/{faits.length || g.lignes.length} présent{presents > 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-surface-50">
              {g.lignes.map((l) => (
                <div key={l.id} className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
                  {l.est_present
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : l.est_present === false
                    ? <XCircle className="h-4 w-4 text-surface-300 shrink-0" />
                    : <Clock className="h-4 w-4 text-surface-300 shrink-0" />}
                  <span className="text-sm text-surface-900">
                    {formatDate(l.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-surface-500">{CRENEAU[l.creneau] || l.creneau}</span>
                  <span className={`ml-auto text-xs font-medium ${l.est_present ? 'text-emerald-600' : 'text-surface-400'}`}>
                    {l.signe ? 'Signé'
                      : l.est_present ? 'Présent'
                      : l.est_present === false ? (l.motif_absence ? `Absent · ${l.motif_absence}` : 'Absent')
                      : 'À venir'}
                  </span>
                  {l.signable && (
                    <button
                      onClick={() => setSignature({
                        id: l.id,
                        libelle: `${formatDate(l.date, { weekday: 'long', day: 'numeric', month: 'long' })} — ${CRENEAU[l.creneau] || l.creneau}`,
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-xs font-semibold hover:bg-brand-100 transition-colors shrink-0"
                    >
                      <PenTool className="h-3.5 w-3.5" /> Signer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {signature && (
        <SignaturePad
          title="Signer mon émargement"
          subtitle={signature.libelle}
          onSign={signer}
          onCancel={() => setSignature(null)}
          isPending={enCours}
        />
      )}
    </div>
  )
}
