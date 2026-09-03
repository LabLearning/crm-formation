'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Award, CheckCircle2, Clock, PenTool } from '@/components/ui/icons'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui'
import { SignaturePad } from '../emargement/SignaturePad'
import { signerMonAttestationAction } from './actions'

interface Ligne {
  id: string
  numero: string | null
  intitule: string
  debut: string | null
  fin: string | null
  duree: number | null
  signee: boolean
  signeeLe: string | null
  signable: boolean
}

/**
 * Attestations AGEFICE du dirigeant : il signe ici le cartouche
 * « Le stagiaire » de son attestation d'assiduité et de règlement.
 */
export function AttestationsClient({ token, lignes }: { token: string; lignes: Ligne[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [signature, setSignature] = useState<Ligne | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function signer(base64: string) {
    if (!signature) return
    setEnCours(true)
    const r = await signerMonAttestationAction(token, signature.id, base64)
    setEnCours(false)
    if (r.success) { toast('success', 'Attestation signée, merci !'); setSignature(null); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-heading font-bold text-surface-900">Mes attestations</h1>
        <p className="text-sm text-surface-500 mt-1">
          L&apos;attestation d&apos;assiduité et de règlement certifie votre présence en formation et le
          paiement de celle-ci : elle est exigée par l&apos;AGEFICE pour votre remboursement. Signez-la ici.
        </p>
      </div>

      {lignes.length === 0 && (
        <div className="card p-10 text-center text-sm text-surface-500">Aucune attestation pour le moment.</div>
      )}

      {lignes.map((l) => (
        <div key={l.id} className="card px-4 py-3.5 flex items-center gap-3 flex-wrap">
          <span className="h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Award className="h-4 w-4 text-brand-600" />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm font-heading font-semibold text-surface-900">{l.intitule}</div>
            <div className="text-xs text-surface-500">
              {l.debut && l.fin ? `Du ${formatDate(l.debut)} au ${formatDate(l.fin)}` : ''}
              {l.duree ? ` · ${l.duree} h` : ''}
              {l.numero ? ` · Dossier AGEFICE n° ${l.numero}` : ''}
            </div>
          </div>
          {l.signee ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 shrink-0">
              <CheckCircle2 className="h-4 w-4" /> Signée{l.signeeLe ? ` le ${formatDate(l.signeeLe)}` : ''}
            </span>
          ) : l.signable ? (
            <button
              onClick={() => setSignature(l)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors shrink-0"
            >
              <PenTool className="h-3.5 w-3.5" /> Signer l&apos;attestation
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 shrink-0">
              <Clock className="h-4 w-4" /> En attente de votre règlement
            </span>
          )}
        </div>
      ))}

      {signature && (
        <SignaturePad
          title="Signer mon attestation"
          subtitle={`${signature.intitule}${signature.numero ? ` — dossier n° ${signature.numero}` : ''}`}
          onSign={signer}
          onCancel={() => setSignature(null)}
          isPending={enCours}
        />
      )}
    </div>
  )
}
