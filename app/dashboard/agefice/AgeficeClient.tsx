'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Landmark, AlertTriangle, Clock, Trash2, Save,
  CheckSquare, Square, GraduationCap, Calendar, Mail,
} from 'lucide-react'
import { Button, Badge, Input, Select, Modal, useToast, RowMenu } from '@/components/ui'
import { AGEFICE_STATUTS, PIECES_AVANT, PIECES_APRES, alerteDelai } from '@/lib/agefice'
import { majDossierAgeficeAction, cocherPieceAgeficeAction, supprimerDossierAgeficeAction, creerDossierDepuisSessionAction } from './actions'

interface Dossier {
  id: string
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
  client?: { raison_sociale: string | null; nom_commercial: string | null; nom: string | null; prenom: string | null } | null
  apprenant?: { prenom: string | null; nom: string | null } | null
  formation?: { intitule: string | null; duree_heures: number | null } | null
}

const euros = (v: number | null | undefined) =>
  v == null ? '—' : `${Number(v).toLocaleString('fr-FR')} €`
const frDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—'

function nomClient(c: Dossier['client']): string {
  if (!c) return '—'
  return c.nom_commercial || c.raison_sociale || `${c.prenom || ''} ${c.nom || ''}`.trim() || '—'
}

/** mailto prérempli vers le Point d'Accueil — l'envoi part de la boîte de l'admin. */
function mailtoPointAccueil(d: Dossier, phase: 'pec' | 'remboursement'): string {
  const dirigeant = d.apprenant ? `${d.apprenant.prenom || ''} ${d.apprenant.nom || ''}`.trim() : nomClient(d.client)
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
      ? `Veuillez trouver ci-joint la demande de prise en charge AGEFICE pour ${dirigeant} (${nomClient(d.client)}) — formation « ${d.formation?.intitule || ''} »${d.date_debut_formation ? ` du ${frDate(d.date_debut_formation)}` : ''}${d.date_fin_formation && d.date_fin_formation !== d.date_debut_formation ? ` au ${frDate(d.date_fin_formation)}` : ''}.`
      : `Veuillez trouver ci-joint la demande de remboursement AGEFICE pour ${dirigeant} (${nomClient(d.client)})${d.numero_dossier ? ` — dossier n° ${d.numero_dossier}` : ''}.`,
    '',
    `Pièces jointes : ${pieces.join(', ')}.`,
    '',
    'Bien cordialement,',
    'Lab Learning — digital@lab-learning.fr',
  ].join('\n')
  return `mailto:${d.point_accueil_email || ''}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`
}

const STATUT_BADGE: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  a_constituer: 'default', depose: 'info', accorde: 'success', refuse: 'danger',
  en_formation: 'info', remboursement: 'warning', solde: 'success',
}

export function AgeficeClient({ dossiers, clients, formations, sessionsExistantes = [], tableAbsente }: {
  dossiers: Dossier[]
  clients: any[]
  formations: any[]
  sessionsExistantes?: any[]
  tableAbsente: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [fiche, setFiche] = useState<Dossier | null>(null)
  const [saving, setSaving] = useState(false)
  const [depuisSessionOpen, setDepuisSessionOpen] = useState(false)
  const [rechercheSession, setRechercheSession] = useState('')

  const enCours = dossiers.filter((d) => !['solde', 'refuse'].includes(d.statut))
  const alertes = dossiers.map((d) => ({ d, a: alerteDelai(d) })).filter((x) => x.a)
  const anneeEnCours = new Date().getFullYear()
  const accordeAnnee = dossiers
    .filter((d) => d.date_accord && new Date(d.date_accord).getFullYear() === anneeEnCours)
    .reduce((s, d) => s + Number(d.montant_accorde || 0), 0)

  async function majFiche(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!fiche) return
    setSaving(true)
    const r = await majDossierAgeficeAction(fiche.id, new FormData(e.currentTarget))
    setSaving(false)
    if (r.success) { toast('success', 'Dossier mis à jour'); setFiche(null); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  async function cocher(d: Dossier, piece: string) {
    const r = await cocherPieceAgeficeAction(d.id, piece, !d.pieces?.[piece])
    if (r.success) {
      setFiche((f) => f && f.id === d.id ? { ...f, pieces: { ...f.pieces, [piece]: !d.pieces?.[piece] } } : f)
      router.refresh()
    } else toast('error', r.error || 'Erreur')
  }

  async function depuisSession(sessionId: string) {
    setSaving(true)
    const r = await creerDossierDepuisSessionAction(sessionId)
    setSaving(false)
    if (r.success) { toast('success', 'Dossier AGEFICE créé depuis la session'); setDepuisSessionOpen(false); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer ce dossier AGEFICE ?')) return
    const r = await supprimerDossierAgeficeAction(id)
    if (r.success) { toast('success', 'Dossier supprimé'); setFiche(null); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Dossiers AGEFICE</h1>
          <p className="text-surface-500 mt-1 text-sm">
            Dirigeants non salariés — dépôt au Point d&apos;Accueil 15 j à 4 mois avant la formation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setDepuisSessionOpen(true)} icon={<Calendar className="h-4 w-4" />}>
            Depuis une session existante
          </Button>
          <Link href="/dashboard/dossiers/nouveau?financement=agefice"
            className="btn-primary inline-flex items-center gap-1.5 !py-2 !px-4 text-sm">
            <Plus className="h-4 w-4" /> Nouveau dossier
          </Link>
        </div>
      </div>

      {tableAbsente && (
        <div className="card p-4 mb-6 border-amber-200 bg-amber-50 text-sm text-amber-800">
          La table <span className="font-mono">dossiers_agefice</span> n&apos;existe pas encore : appliquez la migration
          <span className="font-mono"> supabase/migrations/143_dossiers_agefice.sql</span> dans Supabase, puis rechargez.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="text-xs text-surface-500">Dossiers en cours</div>
          <div className="text-2xl font-bold text-surface-900 mt-1">{enCours.length}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-surface-500">Alertes de délai</div>
          <div className="text-2xl font-bold text-surface-900 mt-1">{alertes.length}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-surface-500">Accordé en {anneeEnCours}</div>
          <div className="text-2xl font-bold text-surface-900 mt-1">{euros(accordeAnnee)}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-surface-500">Taux 2026</div>
          <div className="text-sm font-semibold text-surface-700 mt-2">42 € présentiel · 35 € sync · 20 € async /h</div>
        </div>
      </div>

      {/* Alertes délais */}
      {alertes.length > 0 && (
        <div className="card p-4 mb-6 space-y-2">
          <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Délais AGEFICE à surveiller
          </div>
          {alertes.map(({ d, a }) => (
            <button key={d.id} onClick={() => setFiche(d)}
              className="w-full flex items-center gap-2 text-left text-sm rounded-lg px-3 py-2 hover:bg-surface-50 transition-colors">
              <AlertTriangle className={a!.niveau === 'urgent' ? 'h-4 w-4 text-red-500 shrink-0' : 'h-4 w-4 text-amber-500 shrink-0'} />
              <span className="font-medium text-surface-900 truncate">{nomClient(d.client)}</span>
              <span className="text-surface-500 truncate">{a!.message}</span>
            </button>
          ))}
        </div>
      )}

      {/* Liste des dossiers */}
      {dossiers.length === 0 && !tableAbsente ? (
        <div className="card flex flex-col items-center justify-center text-center py-14 px-8 gap-2">
          <Landmark className="h-6 w-6 text-surface-400" />
          <p className="text-sm text-surface-500">Aucun dossier AGEFICE — créez le premier pour un dirigeant indépendant.</p>
        </div>
      ) : (
        <div className="card divide-y divide-surface-100">
          {dossiers.map((d) => {
            const a = alerteDelai(d)
            const pieces = Object.keys(PIECES_AVANT).filter((k) => k !== 'lettre_projet' && k !== 'mandat' && k !== 'kbis_creation')
            const cochees = pieces.filter((k) => d.pieces?.[k]).length
            return (
              <button key={d.id} onClick={() => setFiche(d)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-50 transition-colors">
                <div className="h-9 w-9 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                  <Landmark className="h-4 w-4 text-surface-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-surface-900 truncate">{nomClient(d.client)}</span>
                    <Badge variant={STATUT_BADGE[d.statut] || 'default'}>{(AGEFICE_STATUTS as any)[d.statut] || d.statut}</Badge>
                    {a && <AlertTriangle className={a.niveau === 'urgent' ? 'h-3.5 w-3.5 text-red-500' : 'h-3.5 w-3.5 text-amber-500'} />}
                  </div>
                  <div className="text-xs text-surface-500 flex items-center gap-3 flex-wrap mt-0.5">
                    {d.formation?.intitule && <span className="flex items-center gap-1 truncate"><GraduationCap className="h-3 w-3 shrink-0" />{d.formation.intitule}</span>}
                    {d.apprenant && <span>{d.apprenant.prenom} {d.apprenant.nom}</span>}
                    {d.date_debut_formation && <span>Début {frDate(d.date_debut_formation)}</span>}
                    <span>{cochees}/{pieces.length} pièces</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-surface-900">{euros(d.montant_accorde ?? d.montant_demande)}</div>
                  <div className="text-[10px] text-surface-400">{d.montant_accorde != null ? 'accordé' : 'estimé'}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Depuis une session existante ── */}
      <Modal isOpen={depuisSessionOpen} onClose={() => setDepuisSessionOpen(false)} title="Dossier AGEFICE depuis une session" size="lg">
        <div className="space-y-3">
          <Input id="recherche_session" label="Rechercher" placeholder="Client, formation, référence…"
            value={rechercheSession} onChange={(e: any) => setRechercheSession(e.target.value)} />
          <div className="max-h-80 overflow-y-auto divide-y divide-surface-100 rounded-xl border border-surface-100">
            {sessionsExistantes
              .filter((se) => {
                const dejaLie = dossiers.some((d: any) => (d as any).session_id === se.id)
                if (dejaLie) return false
                const q = rechercheSession.toLowerCase()
                if (!q) return true
                return [se.reference, se.formation?.intitule, se.client?.nom_commercial, se.client?.raison_sociale]
                  .some((v) => (v || '').toLowerCase().includes(q))
              })
              .slice(0, 40)
              .map((se) => (
                <button key={se.id} disabled={saving} onClick={() => depuisSession(se.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-50 transition-colors flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-900 truncate">
                      {se.client?.nom_commercial || se.client?.raison_sociale || 'Sans client'} — {se.formation?.intitule || 'Formation'}
                    </div>
                    <div className="text-xs text-surface-500">{se.reference} · {frDate(se.date_debut)}</div>
                  </div>
                  <Plus className="h-4 w-4 text-surface-400 shrink-0" />
                </button>
              ))}
          </div>
          <p className="text-[11px] text-surface-400">
            Le client passera automatiquement en financeur AGEFICE ; le dirigeant repris est le premier inscrit de la session.
          </p>
        </div>
      </Modal>

      {/* ── Fiche dossier ── */}
      <Modal isOpen={!!fiche} onClose={() => setFiche(null)} title={fiche ? `Dossier AGEFICE — ${nomClient(fiche.client)}` : ''} size="lg">
        {fiche && (
          <div className="space-y-5">
            <form onSubmit={majFiche} className="space-y-5">
              {/* En-tête du dossier */}
              <div className="grid grid-cols-2 gap-3">
                <Select id="statut" name="statut" label="Statut" defaultValue={fiche.statut}
                  options={Object.entries(AGEFICE_STATUTS).map(([v, l]) => ({ value: v, label: l }))} />
                <Input id="numero_dossier" name="numero_dossier" label="N° de dossier AGEFICE" defaultValue={fiche.numero_dossier || ''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input id="point_accueil" name="point_accueil" label="Point d'Accueil (région)" placeholder="ex. AGEFICE CCI 34" defaultValue={fiche.point_accueil || ''} />
                <Input id="point_accueil_email" name="point_accueil_email" type="email" label="Email du Point d'Accueil" defaultValue={fiche.point_accueil_email || ''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input id="date_debut_formation" name="date_debut_formation" type="date" label="Début formation" defaultValue={fiche.date_debut_formation || ''} />
                <Input id="date_fin_formation" name="date_fin_formation" type="date" label="Fin formation" defaultValue={fiche.date_fin_formation || ''} />
              </div>

              {/* ── Phase 1 : demande de prise en charge ── */}
              <div className="rounded-xl border border-surface-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Phase 1 — Demande de prise en charge</div>
                  <a href={mailtoPointAccueil(fiche, 'pec')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
                    <Mail className="h-3.5 w-3.5" /> Préparer l&apos;email
                  </a>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input id="date_depot" name="date_depot" type="date" label="Déposée le" defaultValue={fiche.date_depot || ''} />
                  <Input id="montant_demande" name="montant_demande" type="number" label="Demandé (€)" defaultValue={fiche.montant_demande?.toString() || ''} />
                  <Input id="montant_accorde" name="montant_accorde" type="number" label="Accordé (€)" defaultValue={fiche.montant_accorde?.toString() || ''} />
                </div>
                <Input id="date_accord" name="date_accord" type="date" label="Accord reçu le" defaultValue={fiche.date_accord || ''} />
              </div>

              {/* ── Phase 2 : règlement client puis remboursement ── */}
              <div className="rounded-xl border border-surface-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Phase 2 — Règlement client & remboursement</div>
                  <a href={mailtoPointAccueil(fiche, 'remboursement')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
                    <Mail className="h-3.5 w-3.5" /> Préparer l&apos;email
                  </a>
                </div>
                <p className="text-[11px] text-surface-400 -mt-1">
                  Paiement direct obligatoire du dirigeant vers l&apos;organisme (virement ou chèque) — toute avance de fonds est interdite par l&apos;AGEFICE.
                  La référence saisie ici figure sur la facture acquittée.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Select id="mode_reglement" name="mode_reglement" label="Mode de règlement" defaultValue={fiche.mode_reglement || ''}
                    options={[{ value: '', label: '—' }, { value: 'virement', label: 'Virement' }, { value: 'cheque', label: 'Chèque' }]} />
                  <Input id="reference_reglement" name="reference_reglement" label="N° de virement / chèque" defaultValue={fiche.reference_reglement || ''} />
                  <Input id="date_reglement" name="date_reglement" type="date" label="Réglé le" defaultValue={fiche.date_reglement || ''} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input id="montant_rembourse" name="montant_rembourse" type="number" label="Remboursé (€)" defaultValue={fiche.montant_rembourse?.toString() || ''} />
                  <Input id="date_remboursement" name="date_remboursement" type="date" label="Remboursement reçu le" defaultValue={fiche.date_remboursement || ''} />
                </div>
              </div>

              <textarea id="notes" name="notes" rows={2} className="input-base resize-none" placeholder="Notes…" defaultValue={fiche.notes || ''} />
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={() => supprimer(fiche.id)}
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
                      <button key={k} type="button" onClick={() => cocher(fiche, k)}
                        className="w-full flex items-start gap-2 text-left text-xs text-surface-700 hover:bg-surface-50 rounded-lg px-2 py-1.5 transition-colors">
                        {fiche.pieces?.[k]
                          ? <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                          : <Square className="h-4 w-4 text-surface-300 shrink-0" />}
                        <span className={fiche.pieces?.[k] ? 'line-through text-surface-400' : ''}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
