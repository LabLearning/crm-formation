'use client'

import { useState } from 'react'
import { Send, CheckCircle2, XCircle, CreditCard, Wallet, Hash, Building2 } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { updateDossierOpcoStatusAction, OPCO_WORKFLOW_LABELS, OPCO_WORKFLOW_COLORS, type OpcoWorkflowStatus } from './opco-actions'

interface DossierOpcoCardProps {
  dossierId: string
  status: OpcoWorkflowStatus
  opcoNom?: string | null
  numeroDossier?: string | null
  motifRefus?: string | null
}

/** Détermine la prochaine action possible selon le statut courant */
function nextAction(status: OpcoWorkflowStatus): { label: string; target: OpcoWorkflowStatus; icon: any; needs?: 'numero' | 'motif' } | null {
  switch (status) {
    case 'a_constituer': return { label: 'Pièces complètes', target: 'pret_a_envoyer', icon: CheckCircle2 }
    case 'pret_a_envoyer': return { label: 'Envoyer à l\'OPCO', target: 'envoye_opco', icon: Send }
    case 'envoye_opco': return { label: 'Marquer en attente', target: 'en_attente_opco', icon: CheckCircle2 }
    case 'en_attente_opco': return { label: 'Valider la prise en charge', target: 'valide_opco', icon: CheckCircle2, needs: 'numero' }
    case 'valide_opco': return { label: 'Mettre en paiement', target: 'mise_en_paiement', icon: CreditCard }
    case 'mise_en_paiement': return { label: 'Marquer payé', target: 'paye', icon: Wallet }
    default: return null
  }
}

export function DossierOpcoCard({ dossierId, status, opcoNom, numeroDossier, motifRefus }: DossierOpcoCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showInput, setShowInput] = useState<'numero' | 'motif' | null>(null)
  const [inputValue, setInputValue] = useState('')

  const next = nextAction(status)

  async function transition(target: OpcoWorkflowStatus, data?: { numero_dossier?: string; motif_refus?: string }) {
    setLoading(true)
    const r = await updateDossierOpcoStatusAction(dossierId, target, data)
    if (r.success) toast('success', `Statut OPCO → ${OPCO_WORKFLOW_LABELS[target]}`)
    else toast('error', r.error || 'Erreur')
    setLoading(false)
    setShowInput(null); setInputValue('')
  }

  async function handleNext() {
    if (!next) return
    if (next.needs === 'numero') {
      setShowInput('numero')
      return
    }
    await transition(next.target)
  }

  async function handleRefuse() {
    setShowInput('motif')
  }

  async function submitInput() {
    if (!inputValue.trim()) { toast('error', showInput === 'numero' ? 'Numéro requis' : 'Motif requis'); return }
    if (showInput === 'numero' && next) {
      await transition(next.target, { numero_dossier: inputValue.trim() })
    } else if (showInput === 'motif') {
      await transition('refuse_opco', { motif_refus: inputValue.trim() })
    }
  }

  return (
    <div className="rounded-xl bg-amber-50/40 border border-amber-200 p-3 space-y-2 mt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-amber-900">
              Dossier OPCO {opcoNom ? `— ${opcoNom}` : ''}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-block px-2 py-0.5 rounded-full text-2xs font-medium ${OPCO_WORKFLOW_COLORS[status]}`}>
                {OPCO_WORKFLOW_LABELS[status]}
              </span>
              {numeroDossier && (
                <span className="text-2xs text-surface-600 flex items-center gap-1">
                  <Hash className="h-3 w-3" /> {numeroDossier}
                </span>
              )}
            </div>
            {motifRefus && status === 'refuse_opco' && (
              <div className="text-2xs text-red-700 mt-1 italic">« {motifRefus} »</div>
            )}
          </div>
        </div>
        {next && status !== 'paye' && status !== 'refuse_opco' && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" onClick={handleNext} isLoading={loading} icon={<next.icon className="h-3 w-3" />}>
              {next.label}
            </Button>
            {status === 'envoye_opco' || status === 'en_attente_opco' ? (
              <Button size="sm" variant="ghost" onClick={handleRefuse} icon={<XCircle className="h-3 w-3" />}>
                Refus
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {showInput && (
        <div className="space-y-2 pt-2 border-t border-amber-200">
          <div>
            <label className="block text-2xs font-medium text-amber-900 mb-1">
              {showInput === 'numero' ? 'Numéro de dossier OPCO retourné *' : 'Motif du refus OPCO *'}
            </label>
            {showInput === 'motif' ? (
              <textarea
                className="input-base text-xs resize-none"
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ex: dossier incomplet, hors scope formation..."
              />
            ) : (
              <input
                type="text"
                className="input-base text-xs"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ex: AKTO-2026-12345"
              />
            )}
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={submitInput} isLoading={loading} disabled={!inputValue.trim()}>
              Confirmer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowInput(null); setInputValue('') }}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
