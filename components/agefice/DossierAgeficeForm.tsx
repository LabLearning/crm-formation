'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Save, CheckSquare, Square, Mail, FileDown, Receipt, Loader2 } from '@/components/ui/icons'
import { Button, Input, Select, useToast } from '@/components/ui'
import { AGEFICE_STATUTS, PIECES_AVANT, PIECES_APRES } from '@/lib/agefice'
import { majDossierAgeficeAction, cocherPieceAgeficeAction, supprimerDossierAgeficeAction, genererFactureAgeficeAction } from '@/app/dashboard/agefice/actions'

/**
 * Formulaire du dossier AGEFICE en 2 phases (prise en charge → règlement
 * client & remboursement) + checklists officielles. Utilisé dans la fiche
 * session (onglet AGEFICE) et sur la vue d'ensemble /dashboard/agefice.
 */
export interface DossierAgefice {
  id: string
  session_id?: string | null
  facture_id?: string | null
  statut: string
  categorie: string
  modalite: string
  duree_heures: number | null
  cout_pedagogique: number | null
  cfp_faible: boolean
  montant_demande: number | null
  montant_accorde: number | null
  montant_rembourse: number | null
  point_accueil: string | null
  point_accueil_email: string | null
  numero_dossier: string | null
  mode_reglement: string | null
  reference_reglement: string | null
  date_reglement: string | null
  date_debut_formation: string | null
  date_fin_formation: string | null
  date_depot: string | null
  date_accord: string | null
  date_remboursement: string | null
  pieces: Record<string, boolean>
  notes: string | null
  client?: { raison_sociale: string | null; nom_commercial: string | null; nom?: string | null; prenom?: string | null } | null
  apprenant?: { prenom: string | null; nom: string | null } | null
  formation?: { intitule: string | null; duree_heures?: number | null } | null
}

export function nomClientAgefice(c: DossierAgefice['client']): string {
  if (!c) return '—'
  return c.nom_commercial || c.raison_sociale || `${c.prenom || ''} ${c.nom || ''}`.trim() || '—'
}

const frDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')

/** mailto prérempli vers le Point d'Accueil — l'envoi part de la boîte de l'admin. */
function mailtoPointAccueil(d: DossierAgefice, phase: 'pec' | 'remboursement'): string {
  const dirigeant = d.apprenant ? `${d.apprenant.prenom || ''} ${d.apprenant.nom || ''}`.trim() : nomClientAgefice(d.client)
  const objet = phase === 'pec'
    ? `Demande de prise en charge AGEFICE — ${dirigeant} — ${d.formation?.intitule || 'formation'}`
    : `Demande de remboursement AGEFICE — ${dirigeant}${d.numero_dossier ? ` — dossier ${d.numero_dossier}` : ''}`
  const pieces = phase === 'pec'
    ? ['l\'imprimé de demande signé', 'la convention / le devis', 'le programme détaillé', 'l\'attestation CFP URSSAF', 'la pièce d\'identité du dirigeant']
    : ['l\'attestation d\'assiduité et de règlement', 'la facture acquittée', 'les feuilles d\'émargement']
  const corps = [
    'Bonjour,',
    '',
    phase === 'pec'
      ? `Veuillez trouver ci-joint la demande de prise en charge AGEFICE pour ${dirigeant} (${nomClientAgefice(d.client)}) — formation « ${d.formation?.intitule || ''} »${d.date_debut_formation ? ` du ${frDate(d.date_debut_formation)}` : ''}${d.date_fin_formation && d.date_fin_formation !== d.date_debut_formation ? ` au ${frDate(d.date_fin_formation)}` : ''}.`
      : `Veuillez trouver ci-joint la demande de remboursement AGEFICE pour ${dirigeant} (${nomClientAgefice(d.client)})${d.numero_dossier ? ` — dossier n° ${d.numero_dossier}` : ''}.`,
    '',
    `Pièces jointes : ${pieces.join(', ')}.`,
    '',
    'Bien cordialement,',
    'Lab Learning — digital@lab-learning.fr',
  ].join('\n')
  return `mailto:${d.point_accueil_email || ''}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`
}

export function DossierAgeficeForm({ dossier, onDone }: { dossier: DossierAgefice; onDone?: () => void }) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [facturation, setFacturation] = useState(false)
  const [pieces, setPieces] = useState<Record<string, boolean>>(dossier.pieces || {})

  async function genererFacture() {
    setFacturation(true)
    const r = await genererFactureAgeficeAction(dossier.id)
    setFacturation(false)
    if (r.success && r.data) {
      toast('success', `Facture ${r.data.numero || ''} prête`)
      window.open(`/api/pdf/facture/${r.data.factureId}`, '_blank')
      router.refresh()
    } else toast('error', r.error || 'Erreur')
  }

  async function majFiche(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const r = await majDossierAgeficeAction(dossier.id, new FormData(e.currentTarget))
    setSaving(false)
    if (r.success) { toast('success', 'Dossier mis à jour'); router.refresh(); onDone?.() }
    else toast('error', r.error || 'Erreur')
  }

  async function cocher(piece: string) {
    const prochaine = !pieces[piece]
    setPieces((p) => ({ ...p, [piece]: prochaine }))
    const r = await cocherPieceAgeficeAction(dossier.id, piece, prochaine)
    if (!r.success) {
      setPieces((p) => ({ ...p, [piece]: !prochaine }))
      toast('error', r.error || 'Erreur')
    }
  }

  async function supprimer() {
    if (!confirm('Supprimer ce dossier AGEFICE ?')) return
    const r = await supprimerDossierAgeficeAction(dossier.id)
    if (r.success) { toast('success', 'Dossier supprimé'); router.refresh(); onDone?.() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-5">
      <form onSubmit={majFiche} className="space-y-5">
        {/* En-tête du dossier */}
        <div className="grid grid-cols-2 gap-3">
          <Select id="statut" name="statut" label="Statut" defaultValue={dossier.statut}
            options={Object.entries(AGEFICE_STATUTS).map(([v, l]) => ({ value: v, label: l }))} />
          <Input id="numero_dossier" name="numero_dossier" label="N° de dossier AGEFICE" defaultValue={dossier.numero_dossier || ''} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input id="point_accueil" name="point_accueil" label="Point d'Accueil (région)" placeholder="ex. AGEFICE CCI 34" defaultValue={dossier.point_accueil || ''} />
          <Input id="point_accueil_email" name="point_accueil_email" type="email" label="Email du Point d'Accueil" defaultValue={dossier.point_accueil_email || ''} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input id="date_debut_formation" name="date_debut_formation" type="date" label="Début formation" defaultValue={dossier.date_debut_formation || ''} />
          <Input id="date_fin_formation" name="date_fin_formation" type="date" label="Fin formation" defaultValue={dossier.date_fin_formation || ''} />
        </div>

        {/* ── Phase 1 : demande de prise en charge ── */}
        <div className="rounded-xl border border-surface-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Phase 1 — Demande de prise en charge</div>
            <a href={mailtoPointAccueil(dossier, 'pec')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
              <Mail className="h-3.5 w-3.5" /> Préparer l&apos;email
            </a>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input id="date_depot" name="date_depot" type="date" label="Déposée le" defaultValue={dossier.date_depot || ''} />
            <Input id="montant_demande" name="montant_demande" type="number" label="Demandé (€)" defaultValue={dossier.montant_demande?.toString() || ''} />
            <Input id="montant_accorde" name="montant_accorde" type="number" label="Accordé (€)" defaultValue={dossier.montant_accorde?.toString() || ''} />
          </div>
          <Input id="date_accord" name="date_accord" type="date" label="Accord reçu le" defaultValue={dossier.date_accord || ''} />
        </div>

        {/* ── Phase 2 : règlement client puis remboursement ── */}
        <div className="rounded-xl border border-surface-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Phase 2 — Règlement client & remboursement</div>
            <a href={mailtoPointAccueil(dossier, 'remboursement')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
              <Mail className="h-3.5 w-3.5" /> Préparer l&apos;email
            </a>
          </div>
          <p className="text-[11px] text-surface-400 -mt-1">
            Paiement direct obligatoire du dirigeant vers l&apos;organisme (virement ou chèque) — toute avance de fonds est interdite par l&apos;AGEFICE.
            La référence saisie ici figure sur la facture acquittée.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Select id="mode_reglement" name="mode_reglement" label="Mode de règlement" defaultValue={dossier.mode_reglement || ''}
              options={[{ value: '', label: '—' }, { value: 'virement', label: 'Virement' }, { value: 'cheque', label: 'Chèque' }]} />
            <Input id="reference_reglement" name="reference_reglement" label="N° de virement / chèque" defaultValue={dossier.reference_reglement || ''} />
            <Input id="date_reglement" name="date_reglement" type="date" label="Réglé le" defaultValue={dossier.date_reglement || ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="montant_rembourse" name="montant_rembourse" type="number" label="Remboursé (€)" defaultValue={dossier.montant_rembourse?.toString() || ''} />
            <Input id="date_remboursement" name="date_remboursement" type="date" label="Remboursement reçu le" defaultValue={dossier.date_remboursement || ''} />
          </div>

          {/* Documents de la demande de remboursement */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button type="button" onClick={genererFacture} disabled={facturation}
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-xl border border-surface-200 bg-white px-3 py-2 text-surface-700 hover:border-surface-300 transition-colors disabled:opacity-50">
              {facturation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
              {dossier.facture_id ? 'Voir la facture' : 'Générer la facture'}
            </button>
            <a href={`/api/pdf/attestation-agefice/${dossier.id}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-xl border border-surface-200 bg-white px-3 py-2 text-surface-700 hover:border-surface-300 transition-colors">
              <FileDown className="h-3.5 w-3.5" /> Attestation d&apos;assiduité et de règlement
            </a>
            <span className="text-[11px] text-surface-400">
              Enregistrez le paiement sur la facture pour qu&apos;elle ressorte « acquittée ».
            </span>
          </div>
        </div>

        <textarea id="notes" name="notes" rows={2} className="input-base resize-none" placeholder="Notes…" defaultValue={dossier.notes || ''} />
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={supprimer}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
          <Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" />}>Enregistrer</Button>
        </div>
      </form>

      {/* Checklists de pièces — liste officielle AGEFICE (janvier 2026) */}
      <div className="grid md:grid-cols-2 gap-4">
        {[{ titre: 'Pièces — demande de prise en charge', dict: PIECES_AVANT }, { titre: 'Pièces — demande de remboursement', dict: PIECES_APRES }].map(({ titre, dict }) => (
          <div key={titre} className="rounded-xl border border-surface-200 p-3">
            <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">{titre}</div>
            <div className="space-y-1.5">
              {Object.entries(dict).map(([k, label]) => (
                <button key={k} type="button" onClick={() => cocher(k)}
                  className="w-full flex items-start gap-2 text-left text-xs text-surface-700 hover:bg-surface-50 rounded-lg px-2 py-1.5 transition-colors">
                  {pieces[k]
                    ? <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                    : <Square className="h-4 w-4 text-surface-300 shrink-0" />}
                  <span className={pieces[k] ? 'line-through text-surface-400' : ''}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
