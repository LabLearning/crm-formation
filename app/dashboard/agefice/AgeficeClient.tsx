'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Landmark, AlertTriangle, Clock, Euro, Trash2, Save,
  CheckSquare, Square, GraduationCap, Building2, X,
} from 'lucide-react'
import { Button, Badge, Input, Select, Modal, useToast, RowMenu } from '@/components/ui'
import {
  AGEFICE_STATUTS, AGEFICE_CATEGORIES, AGEFICE_MODALITES,
  PIECES_AVANT, PIECES_APRES, estimationPriseEnCharge, plafondDossier, alerteDelai,
} from '@/lib/agefice'
import {
  creerDossierAgeficeAction, majDossierAgeficeAction,
  cocherPieceAgeficeAction, supprimerDossierAgeficeAction,
} from './actions'

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
  numero_dossier: string | null
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

const STATUT_BADGE: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  a_constituer: 'default', depose: 'info', accorde: 'success', refuse: 'danger',
  en_formation: 'info', remboursement: 'warning', solde: 'success',
}

export function AgeficeClient({ dossiers, clients, formations, tableAbsente }: {
  dossiers: Dossier[]
  clients: any[]
  formations: any[]
  tableAbsente: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [fiche, setFiche] = useState<Dossier | null>(null)
  const [saving, setSaving] = useState(false)

  // Estimation en direct dans le formulaire de création
  const [categorie, setCategorie] = useState('metier')
  const [modalite, setModalite] = useState('presentiel')
  const [heures, setHeures] = useState('')
  const [cout, setCout] = useState('')
  const [cfpFaible, setCfpFaible] = useState(false)

  const estimation = useMemo(() => estimationPriseEnCharge({
    modalite, duree_heures: parseFloat(heures) || 0,
    cout_pedagogique: parseFloat(cout) || 0, categorie, cfp_faible: cfpFaible,
  }), [modalite, heures, cout, categorie, cfpFaible])

  const enCours = dossiers.filter((d) => !['solde', 'refuse'].includes(d.statut))
  const alertes = dossiers.map((d) => ({ d, a: alerteDelai(d) })).filter((x) => x.a)
  const anneeEnCours = new Date().getFullYear()
  const accordeAnnee = dossiers
    .filter((d) => d.date_accord && new Date(d.date_accord).getFullYear() === anneeEnCours)
    .reduce((s, d) => s + Number(d.montant_accorde || 0), 0)

  async function creer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const r = await creerDossierAgeficeAction(new FormData(e.currentTarget))
    setSaving(false)
    if (r.success) { toast('success', 'Dossier AGEFICE créé'); setCreateOpen(false); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

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
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>Nouveau dossier</Button>
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

      {/* ── Création ── */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau dossier AGEFICE" size="lg">
        <form onSubmit={creer} className="space-y-4">
          <Select id="client_id" name="client_id" label="Client (dirigeant non salarié) *"
            options={clients.map((c) => ({ value: c.id, label: (c.nom_commercial || c.raison_sociale || `${c.prenom || ''} ${c.nom || ''}`).trim() + (c.financeur_type === 'agefice' ? ' — AGEFICE' : '') }))} />
          <Select id="formation_id" name="formation_id" label="Formation"
            options={[{ value: '', label: '—' }, ...formations.map((f) => ({ value: f.id, label: f.intitule }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Select id="categorie" name="categorie" label="Catégorie" value={categorie} onChange={(e: any) => setCategorie(e.target.value)}
              options={Object.entries(AGEFICE_CATEGORIES).map(([v, l]) => ({ value: v, label: l }))} />
            <Select id="modalite" name="modalite" label="Modalité" value={modalite} onChange={(e: any) => setModalite(e.target.value)}
              options={Object.entries(AGEFICE_MODALITES).map(([v, m]) => ({ value: v, label: `${m.label} — ${m.taux} €/h` }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="duree_heures" name="duree_heures" type="number" label="Durée (heures)" value={heures} onChange={(e: any) => setHeures(e.target.value)} placeholder="14" />
            <Input id="cout_pedagogique" name="cout_pedagogique" type="number" label="Coût pédagogique (€ HT)" value={cout} onChange={(e: any) => setCout(e.target.value)} placeholder="1180" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="date_debut_formation" name="date_debut_formation" type="date" label="Début de formation" />
            <Input id="date_fin_formation" name="date_fin_formation" type="date" label="Fin de formation" />
          </div>
          <Input id="point_accueil" name="point_accueil" label="Point d'Accueil AGEFICE" placeholder="ex. CCI Hérault, CPME 34…" />
          <label className="flex items-center gap-2 text-sm text-surface-700">
            <input type="checkbox" name="cfp_faible" checked={cfpFaible} onChange={(e) => setCfpFaible(e.target.checked)} className="rounded border-surface-300" />
            CFP versée inférieure à 7 € (enveloppe réduite à 600 €/an)
          </label>

          <div className="rounded-xl bg-surface-50 border border-surface-200 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-surface-500">Prise en charge estimée</div>
              <div className="text-[11px] text-surface-400 mt-0.5">
                Plafond {plafondDossier(categorie, cfpFaible).toLocaleString('fr-FR')} €/an · min(heures × taux, coût, plafond)
              </div>
            </div>
            <div className="text-xl font-bold text-surface-900 flex items-center gap-1">
              <Euro className="h-4 w-4 text-surface-400" />{estimation.toLocaleString('fr-FR')} €
            </div>
          </div>

          <textarea id="notes" name="notes" rows={2} className="input-base resize-none" placeholder="Notes…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" />}>Créer le dossier</Button>
          </div>
        </form>
      </Modal>

      {/* ── Fiche dossier ── */}
      <Modal isOpen={!!fiche} onClose={() => setFiche(null)} title={fiche ? `Dossier AGEFICE — ${nomClient(fiche.client)}` : ''} size="lg">
        {fiche && (
          <div className="space-y-5">
            <form onSubmit={majFiche} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Select id="statut" name="statut" label="Statut" defaultValue={fiche.statut}
                  options={Object.entries(AGEFICE_STATUTS).map(([v, l]) => ({ value: v, label: l }))} />
                <Input id="numero_dossier" name="numero_dossier" label="N° de dossier AGEFICE" defaultValue={fiche.numero_dossier || ''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input id="point_accueil" name="point_accueil" label="Point d'Accueil" defaultValue={fiche.point_accueil || ''} />
                <Input id="date_depot" name="date_depot" type="date" label="Date de dépôt" defaultValue={fiche.date_depot || ''} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input id="montant_demande" name="montant_demande" type="number" label="Demandé (€)" defaultValue={fiche.montant_demande?.toString() || ''} />
                <Input id="montant_accorde" name="montant_accorde" type="number" label="Accordé (€)" defaultValue={fiche.montant_accorde?.toString() || ''} />
                <Input id="montant_rembourse" name="montant_rembourse" type="number" label="Remboursé (€)" defaultValue={fiche.montant_rembourse?.toString() || ''} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input id="date_accord" name="date_accord" type="date" label="Date d'accord" defaultValue={fiche.date_accord || ''} />
                <Input id="date_debut_formation" name="date_debut_formation" type="date" label="Début formation" defaultValue={fiche.date_debut_formation || ''} />
                <Input id="date_fin_formation" name="date_fin_formation" type="date" label="Fin formation" defaultValue={fiche.date_fin_formation || ''} />
              </div>
              <textarea id="notes" name="notes" rows={2} className="input-base resize-none" placeholder="Notes…" defaultValue={fiche.notes || ''} />
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={() => supprimer(fiche.id)}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
                <Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" />}>Enregistrer</Button>
              </div>
            </form>

            {/* Checklists de pièces */}
            <div className="grid md:grid-cols-2 gap-4">
              {[{ titre: 'Pièces AVANT la formation (dépôt)', dict: PIECES_AVANT }, { titre: 'Pièces APRÈS la formation (remboursement)', dict: PIECES_APRES }].map(({ titre, dict }) => (
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
