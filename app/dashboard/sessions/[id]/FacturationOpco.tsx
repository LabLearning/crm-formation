'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReceiptEuro, Upload, Download, Trash2, Loader2, FileCheck2, AlertCircle,
  CheckCircle2, ExternalLink,
} from 'lucide-react'
import { Button, Input, Select, Modal, useToast } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import {
  enregistrerFinancementOpcoAction, deposerAccordPecAction, genererFactureOpcoAction,
} from './facture-opco-actions'
import { lienPieceAction, retirerPieceAction } from './pieces-actions'

interface Opco { id: string; code: string; nom: string }
interface Accord { id: string; file_name: string | null; date_piece: string | null; created_at: string }
interface Facture { id: string; numero: string | null; status: string | null; montant_ttc: number | null }

const euro = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

/** D'où vient l'accord — un accord OPCO n'arrive jamais du formateur. */
const PROVENANCES = [
  { value: 'mail', label: 'Reçu par mail' },
  { value: 'crm', label: "Téléchargé du portail OPCO" },
  { value: 'papier', label: 'Numérisé depuis le papier' },
  { value: 'dendreo', label: "Repris de l'ancien outil" },
]

/**
 * Facturation OPCO d'une session terminée.
 *
 * L'ordre suit celui du dossier réel : l'OPCO accorde la prise en charge et
 * attribue un numéro de dossier, puis seulement la facture peut partir. Tant
 * que l'accord n'est pas au dossier, la facture est émise à l'aveugle et
 * l'OPCO la rejette.
 */
export function FacturationOpco({
  sessionId, statutSession, opcos, opcoId, numeroDossier, montantFinance, accordDate,
  prixHt, dejaFactureAilleurs, accord, facture,
}: {
  sessionId: string
  statutSession: string | null
  opcos: Opco[]
  opcoId: string | null
  numeroDossier: string | null
  montantFinance: number | null
  accordDate: string | null
  prixHt: number | null
  dejaFactureAilleurs: number
  accord: Accord | null
  facture: Facture | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [depotOuvert, setDepotOuvert] = useState(false)
  const [depotEnCours, setDepotEnCours] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [generation, setGeneration] = useState(false)

  const montantAFacturer = montantFinance ?? prixHt ?? 0
  const dejaAilleurs = Number(dejaFactureAilleurs || 0)

  async function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const res = await enregistrerFinancementOpcoAction(sessionId, new FormData(e.currentTarget))
    setSaving(false)
    if (!res.success) { toast('error', res.error || 'Erreur'); return }
    toast('success', 'Financement enregistré')
    router.refresh()
  }

  async function deposer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setDepotEnCours(true)
    const res = await deposerAccordPecAction(sessionId, new FormData(e.currentTarget))
    setDepotEnCours(false)
    if (!res.success) { toast('error', res.error || 'Erreur'); return }
    toast('success', 'Accord de prise en charge déposé')
    setDepotOuvert(false)
    router.refresh()
  }

  async function ouvrirAccord() {
    if (!accord) return
    setBusy('accord')
    const r = await lienPieceAction(accord.id)
    setBusy(null)
    if (r.success) window.open((r.data as any).url, '_blank')
    else toast('error', r.error || 'Erreur')
  }

  async function retirerAccord() {
    if (!accord || !confirm('Retirer cet accord de prise en charge ?')) return
    setBusy('accord')
    const r = await retirerPieceAction(accord.id, sessionId)
    setBusy(null)
    if (r.success) { toast('success', 'Accord retiré'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  async function genererFacture(forcer = false) {
    setGeneration(true)
    const r = await genererFactureOpcoAction(sessionId, forcer ? { forcer: true } : undefined)
    setGeneration(false)
    if (r.success) { toast('success', `Facture ${(r.data as any)?.numero || ''} créée`); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  const terminee = statutSession === 'terminee'
  const opcoChoisi = opcos.find((o) => o.id === opcoId) || null

  return (
    <div className="space-y-4">
      {!terminee && (
        <div className="card p-4 flex items-start gap-2.5 border-surface-200 bg-surface-50/60">
          <AlertCircle className="h-4 w-4 text-surface-400 mt-0.5 shrink-0" />
          <p className="text-sm text-surface-600">
            La session n&apos;est pas terminée. Vous pouvez déjà saisir l&apos;accord de prise en charge ;
            la facture, elle, ne s&apos;émet qu&apos;une fois la formation réalisée.
          </p>
        </div>
      )}

      {/* ── Prise en charge ── */}
      <form onSubmit={enregistrer} className="card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-heading font-semibold text-surface-900 flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-brand-500" />
            Prise en charge
          </h2>
          <p className="text-xs text-surface-500 mt-0.5">
            Le numéro de dossier est repris sur la facture comme numéro de prise en charge : sans lui, l&apos;OPCO ne règle pas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            id="opco_id" name="opco_id" label="OPCO financeur" defaultValue={opcoId || ''}
            options={[{ value: '', label: '— Aucun —' }, ...opcos.map((o) => ({ value: o.id, label: o.nom }))]}
          />
          <Input
            id="numero_dossier_opco" name="numero_dossier_opco" label="Numéro de dossier OPCO"
            defaultValue={numeroDossier || ''} placeholder="Ex. 2026-AKTO-014235"
          />
          <Input
            id="montant_finance_opco" name="montant_finance_opco" label="Montant accordé (€ HT)"
            defaultValue={montantFinance != null ? String(montantFinance) : ''}
            placeholder={prixHt != null ? `Prix de la session : ${prixHt}` : '0,00'}
          />
          <Input
            id="accord_pec_date" name="accord_pec_date" type="date" label="Date de l'accord"
            defaultValue={accordDate || ''}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={saving}>Enregistrer</Button>
        </div>
      </form>

      {/* ── Accord de prise en charge ── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-heading font-semibold text-surface-900 flex items-center gap-2">
              {accord
                ? <CheckCircle2 className="h-4 w-4 text-success-500" />
                : <AlertCircle className="h-4 w-4 text-danger-400" />}
              Accord de prise en charge
            </h2>
            <p className="text-xs text-surface-500 mt-0.5">
              {accord
                ? `${accord.file_name || 'Document'} · déposé le ${formatDate(accord.date_piece || accord.created_at)}`
                : "Le document reçu de l'OPCO — portail ou pièce jointe de mail."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {accord ? (
              <>
                <button onClick={ouvrirAccord} disabled={busy === 'accord'}
                  className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs disabled:opacity-50">
                  {busy === 'accord' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Ouvrir
                </button>
                <button onClick={retirerAccord} disabled={busy === 'accord'}
                  className="p-2 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                  aria-label="Retirer l'accord">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Button size="sm" onClick={() => setDepotOuvert(true)} icon={<Upload className="h-4 w-4" />}>Déposer</Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Facture ── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-heading font-semibold text-surface-900 flex items-center gap-2">
              <ReceiptEuro className="h-4 w-4 text-brand-500" />
              Facture OPCO
            </h2>
            <p className="text-xs text-surface-500 mt-0.5">
              {facture
                ? `${facture.numero || 'Brouillon'} · ${facture.montant_ttc != null ? euro(Number(facture.montant_ttc)) : '—'}`
                : opcoChoisi
                  ? `Adressée à ${opcoChoisi.nom}, pour le compte de l'entreprise.`
                  : "Renseignez l'OPCO financeur ci-dessus pour pouvoir facturer."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {facture ? (
              <>
                <a href={`/api/pdf/facture/${facture.id}`} target="_blank" rel="noreferrer"
                  className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs">
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </a>
                <a href={`/dashboard/factures/${facture.id}`}
                  className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
                </a>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => genererFacture(false)}
                isLoading={generation}
                disabled={!terminee || !opcoId || !(montantAFacturer > 0)}
                icon={<ReceiptEuro className="h-4 w-4" />}
              >
                Générer la facture
              </Button>
            )}
          </div>
        </div>

        {!facture && (
          <ul className="mt-4 space-y-1.5">
            <Condition ok={terminee} texte="Session terminée" />
            <Condition ok={!!opcoId} texte="OPCO financeur renseigné" />
            <Condition ok={montantAFacturer > 0} texte={`Montant à facturer connu${montantAFacturer > 0 ? ` (${euro(montantAFacturer)})` : ''}`} />
            <Condition ok={!!numeroDossier} texte="Numéro de dossier OPCO" facultatif />
            <Condition ok={!!accord} texte="Accord de prise en charge au dossier" facultatif />
          </ul>
        )}

        {!facture && dejaAilleurs > 0 && (
          <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50/60 px-4 py-3">
            <p className="text-sm text-surface-700">
              Cette session a déjà été facturée <strong>{euro(dejaAilleurs)}</strong> depuis Dendreo.
              Générer une facture ici ferait double emploi.
            </p>
            <button onClick={() => genererFacture(true)} disabled={generation}
              className="mt-2 text-xs font-semibold text-danger-700 hover:underline disabled:opacity-50">
              Facturer quand même
            </button>
          </div>
        )}
      </div>

      {/* Dépôt de l'accord */}
      <Modal isOpen={depotOuvert} onClose={() => setDepotOuvert(false)} title="Déposer l'accord de prise en charge" size="md">
        <form onSubmit={deposer} className="space-y-4">
          <p className="text-sm text-surface-600">
            Le document tel que l&apos;OPCO l&apos;a émis. Il justifie le financement au dossier de la session.
          </p>

          <div>
            <label htmlFor="fichier" className="block text-sm font-medium text-surface-700 mb-1.5">
              Fichier (PDF ou image, 15 Mo maximum)
            </label>
            <input id="fichier" name="fichier" type="file" accept=".pdf,image/*" required
              className="block w-full text-sm text-surface-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-surface-200 file:bg-white file:text-sm file:font-medium hover:file:bg-surface-50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select id="origine" name="origine" label="Provenance" options={PROVENANCES} defaultValue="mail" />
            <Input id="date_piece" name="date_piece" type="date" label="Date de l'accord" defaultValue={accordDate || ''} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDepotOuvert(false)}>Annuler</Button>
            <Button type="submit" isLoading={depotEnCours} icon={<Upload className="h-4 w-4" />}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/** Condition d'émission de la facture : bloquante, ou seulement conseillée. */
function Condition({ ok, texte, facultatif }: { ok: boolean; texte: string; facultatif?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {ok
        ? <CheckCircle2 className="h-3.5 w-3.5 text-success-500 shrink-0" />
        : <AlertCircle className={cn('h-3.5 w-3.5 shrink-0', facultatif ? 'text-amber-400' : 'text-danger-400')} />}
      <span className={ok ? 'text-surface-500' : 'text-surface-700'}>
        {texte}
        {!ok && facultatif && <span className="text-surface-400"> — conseillé, pas bloquant</span>}
      </span>
    </li>
  )
}
