'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Landmark, AlertTriangle, Clock, Trash2, Save,
  CheckSquare, Square, GraduationCap, Calendar, Mail,
} from '@/components/ui/icons'
import { Button, Badge, Input, Select, Modal, useToast, RowMenu } from '@/components/ui'
import { AGEFICE_STATUTS, PIECES_AVANT, PIECES_APRES, alerteDelai } from '@/lib/agefice'
import { creerDossierDepuisSessionAction } from './actions'
import { DossierAgeficeForm } from '@/components/agefice/DossierAgeficeForm'

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

  async function depuisSession(sessionId: string) {
    setSaving(true)
    const r = await creerDossierDepuisSessionAction(sessionId)
    setSaving(false)
    if (r.success) { toast('success', 'Dossier AGEFICE créé depuis la session'); setDepuisSessionOpen(false); router.refresh() }
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
            <button key={d.id} onClick={() => (d as any).session_id ? router.push(`/dashboard/sessions/${(d as any).session_id}?tab=facturation`) : setFiche(d)}
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
              <button key={d.id} onClick={() => (d as any).session_id ? router.push(`/dashboard/sessions/${(d as any).session_id}?tab=facturation`) : setFiche(d)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-50 transition-colors">
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
        {fiche && <DossierAgeficeForm dossier={fiche as any} onDone={() => setFiche(null)} />}
      </Modal>
    </div>
  )
}
