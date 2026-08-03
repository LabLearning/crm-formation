'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Download, FileText, Award, Loader2, CheckCircle2, Clock } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { generateFacturesPerCandidatPoeiAction } from '../actions'

interface Candidat {
  id: string
  apprenant?: { id: string; prenom: string | null; nom: string | null } | null
}
interface FactureInfo { id: string; numero: string | null; status: string; montant_ttc: number | null }

const FACT_STATUS: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-surface-100 text-surface-600' },
  emise: { label: 'Émise', cls: 'bg-blue-100 text-blue-700' },
  envoyee: { label: 'Envoyée', cls: 'bg-indigo-100 text-indigo-700' },
  payee_partiellement: { label: 'Payée en partie', cls: 'bg-amber-100 text-amber-700' },
  payee: { label: 'Payée', cls: 'bg-emerald-100 text-emerald-700' },
  en_retard: { label: 'En retard', cls: 'bg-rose-100 text-rose-700' },
  annulee: { label: 'Annulée', cls: 'bg-surface-100 text-surface-400' },
}

export function PoeiFacturation({
  poeiId, sessionId, sessionTerminee, candidats, facturesByCandidat,
}: {
  poeiId: string
  sessionId: string | null
  sessionTerminee: boolean
  candidats: Candidat[]
  facturesByCandidat: Record<string, FactureInfo>
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [gen, setGen] = useState(false)

  async function generate() {
    setGen(true)
    const r = await generateFacturesPerCandidatPoeiAction(poeiId)
    setGen(false)
    if (r.success) {
      const { created, updated, skipped } = (r.data || {}) as { created: number; updated: number; skipped: number }
      const parts: string[] = []
      if (created) parts.push(`${created} générée${created > 1 ? 's' : ''}`)
      if (updated) parts.push(`${updated} mise${updated > 1 ? 's' : ''} à jour`)
      if (skipped) parts.push(`${skipped} déjà émise${skipped > 1 ? 's' : ''}`)
      toast('success', parts.length ? `Factures : ${parts.join(', ')}` : 'Aucune facture modifiée')
      router.refresh()
    } else toast('error', r.error || 'Erreur')
  }

  const nbFactures = Object.keys(facturesByCandidat).length

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-heading font-semibold text-surface-900">Facturation & documents de clôture</span>
        </div>
        {sessionTerminee && (
          <div className="flex items-center gap-2">
            <Button onClick={generate} isLoading={gen} size="sm" icon={<Receipt className="h-4 w-4" />}>
              {nbFactures > 0 ? 'Mettre à jour les factures' : 'Générer les factures'}
            </Button>
            <a href={`/api/pdf/poei-certificats/${poeiId}`} className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm">
              <Download className="h-4 w-4" /> Certificats (ZIP)
            </a>
          </div>
        )}
      </div>

      {!sessionTerminee ? (
        <div className="flex items-center gap-2 rounded-xl bg-surface-50 border border-surface-200/70 px-4 py-3 text-sm text-surface-500">
          <Clock className="h-4 w-4 shrink-0" />
          Facturation et certificats disponibles une fois la <strong className="mx-1 text-surface-700">session terminée</strong>.
        </div>
      ) : candidats.length === 0 ? (
        <div className="text-sm text-surface-500">Aucun candidat.</div>
      ) : (
        <div className="rounded-xl border border-surface-200 divide-y divide-surface-100 overflow-hidden">
          {candidats.map((c) => {
            const nom = `${c.apprenant?.prenom || ''} ${c.apprenant?.nom || ''}`.trim() || 'Candidat'
            const fac = facturesByCandidat[c.id]
            const st = fac ? (FACT_STATUS[fac.status] || FACT_STATUS.brouillon) : null
            return (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-900 truncate">{nom}</div>
                  {fac && (
                    <div className="text-xs text-surface-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${st!.cls}`}>{st!.label}</span>
                      {fac.numero && <span>{fac.numero}</span>}
                      {fac.montant_ttc != null && <span className="tabular-nums">{Number(fac.montant_ttc).toLocaleString('fr-FR')} €</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {fac ? (
                    <a href={`/api/pdf/facture/${fac.id}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-2.5 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50">
                      <FileText className="h-3.5 w-3.5" /> Facture
                    </a>
                  ) : (
                    <span className="text-xs text-surface-300 px-2.5">Pas de facture</span>
                  )}
                  {c.apprenant?.id && sessionId && (
                    <a href={`/api/pdf/certificat-realisation/${c.apprenant.id}?session=${sessionId}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-2.5 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50">
                      <Award className="h-3.5 w-3.5" /> Certificat
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
