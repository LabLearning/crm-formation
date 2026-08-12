'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Upload, Download, Trash2, Loader2, ShieldAlert, FolderCheck } from 'lucide-react'
import { Button, Modal, Input, Select, useToast } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { PIECES, ORIGINES, completude } from '@/lib/pieces-session'
import type { EtatPiece } from '@/lib/pieces-session'
import { deposerPieceAction, retirerPieceAction, lienPieceAction } from '@/app/dashboard/sessions/[id]/pieces-actions'

const LABEL_ORIGINE: Record<string, string> = {
  crm: 'Produite par le CRM',
  mail: 'Reçue par mail',
  papier: 'Numérisée',
  dendreo: 'Ancien outil',
}

/**
 * Complétude du dossier d'une action de formation.
 *
 * Chaque pièce est soit produite par le CRM, soit justifiée par un document
 * déposé — le cas courant, puisque les formateurs envoient leurs feuilles et
 * questionnaires par mail.
 */
export function PiecesDossier({
  sessionId, etats, tableManquante,
}: {
  sessionId: string
  etats: (EtatPiece & { fichier?: string | null; dateDepot?: string | null })[]
  tableManquante?: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [depot, setDepot] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const parCle = new Map(etats.map((e) => [e.cle, e]))
  const etat = completude(etats)

  async function deposer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const res = await deposerPieceAction(sessionId, new FormData(e.currentTarget))
    setSaving(false)
    if (!res.success) { toast('error', res.error || 'Erreur'); return }
    toast('success', 'Pièce enregistrée')
    setDepot(null)
    router.refresh()
  }

  async function ouvrir(documentId: string) {
    setBusy(documentId)
    const r = await lienPieceAction(documentId)
    setBusy(null)
    if (r.success) window.open((r.data as any).url, '_blank')
    else toast('error', r.error || 'Erreur')
  }

  async function retirer(documentId: string) {
    if (!confirm('Retirer ce justificatif ?')) return
    setBusy(documentId)
    const r = await retirerPieceAction(documentId, sessionId)
    setBusy(null)
    if (r.success) { toast('success', 'Justificatif retiré'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  const pieceEnCours = PIECES.find((p) => p.cle === depot)

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-heading font-semibold text-surface-900 flex items-center gap-2">
              <FolderCheck className="h-4 w-4 text-brand-500" />
              Dossier de la session
            </h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Les pièces qu&apos;un auditeur demandera pour cette action. Celles que le CRM produit comptent
              d&apos;office ; les autres se justifient en déposant le document.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn('text-2xl font-heading font-bold', etat.complet ? 'text-success-600' : 'text-danger-600')}>
              {etat.presentes}/{etat.total}
            </div>
            <div className="text-[11px] text-surface-500">pièces au dossier</div>
          </div>
        </div>

        <div className="h-2 rounded-full bg-surface-100 overflow-hidden mt-4">
          <div className={cn('h-full rounded-full transition-all duration-500', etat.complet ? 'bg-success-500' : 'bg-surface-900')}
            style={{ width: `${(etat.presentes / etat.total) * 100}%` }} />
        </div>

        {etat.majeuresManquantes.length > 0 && (
          <div className="mt-4 flex items-start gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-danger-500 mt-0.5 shrink-0" />
            <div className="text-surface-700">
              <span className="font-medium">{etat.majeuresManquantes.length} pièce(s) à enjeu majeur manquante(s) : </span>
              {etat.majeuresManquantes.map((p) => `${p.label} (ind. ${p.indicateur})`).join(' · ')}
            </div>
          </div>
        )}
      </div>

      {tableManquante && (
        <div className="card p-4 border-warning-200 bg-warning-50/50 text-sm text-surface-700">
          Appliquez la migration <code className="px-1.5 py-0.5 rounded bg-white border border-warning-200 text-xs">124_pieces_dossier_session.sql</code> pour pouvoir déposer les justificatifs.
        </div>
      )}

      <div className="space-y-2">
        {PIECES.map((p) => {
          const e = parCle.get(p.cle)
          const ok = !!e?.presente
          return (
            <div key={p.cle} className={cn('card p-4 flex items-center gap-3 flex-wrap', !ok && p.majeure && 'border-danger-200')}>
              <span className="shrink-0">
                {ok ? <CheckCircle2 className="h-5 w-5 text-success-500" /> : <Circle className={cn('h-5 w-5', p.majeure ? 'text-danger-400' : 'text-surface-300')} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-heading font-semibold text-surface-900">{p.label}</span>
                  <span className="text-[11px] text-surface-400">indicateur {p.indicateur}</span>
                  {p.majeure && !ok && (
                    <span className="text-[10px] font-semibold text-danger-700 bg-danger-50 border border-danger-100 rounded-full px-1.5 py-0.5">
                      Enjeu majeur
                    </span>
                  )}
                </div>
                <div className="text-xs text-surface-500 mt-0.5">
                  {ok
                    ? `${LABEL_ORIGINE[e!.source || 'crm'] || e!.source}${e!.dateDepot ? ` · ${formatDate(e!.dateDepot)}` : ''}${e!.fichier ? ` · ${e!.fichier}` : ''}`
                    : p.aide}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {e?.documentId && (
                  <>
                    <button onClick={() => ouvrir(e.documentId!)} disabled={busy === e.documentId}
                      className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs disabled:opacity-50">
                      {busy === e.documentId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Ouvrir
                    </button>
                    <button onClick={() => retirer(e.documentId!)} disabled={busy === e.documentId}
                      className="p-2 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                      aria-label="Retirer le justificatif">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                {!e?.documentId && (
                  <Button size="sm" variant={ok ? 'secondary' : 'primary'} onClick={() => setDepot(p.cle)} icon={<Upload className="h-4 w-4" />}>
                    {ok ? 'Ajouter une pièce' : 'Déposer'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Modal isOpen={!!depot} onClose={() => setDepot(null)} title={pieceEnCours ? `Déposer : ${pieceEnCours.label}` : 'Déposer une pièce'} size="md">
        <form ref={formRef} onSubmit={deposer} className="space-y-4">
          <input type="hidden" name="piece" value={depot || ''} />
          {pieceEnCours && <p className="text-sm text-surface-600">{pieceEnCours.aide}</p>}

          <div>
            <label htmlFor="fichier" className="block text-sm font-medium text-surface-700 mb-1.5">Fichier (PDF ou image, 15 Mo maximum)</label>
            <input id="fichier" name="fichier" type="file" accept=".pdf,image/*" required
              className="block w-full text-sm text-surface-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-surface-200 file:bg-white file:text-sm file:font-medium hover:file:bg-surface-50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select id="origine" name="origine" label="Provenance" options={ORIGINES} defaultValue="mail" />
            <Input id="date_piece" name="date_piece" type="date" label="Date de la pièce" />
          </div>

          <Input id="description" name="description" label="Précision (facultatif)" placeholder="Ex. reçue de Kevin Devie le 8 août" />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDepot(null)}>Annuler</Button>
            <Button type="submit" isLoading={saving} icon={<Upload className="h-4 w-4" />}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
