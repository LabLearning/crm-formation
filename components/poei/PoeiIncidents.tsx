'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Plus, CheckCircle2, Clock, ShieldAlert } from '@/components/ui/icons'
import { Button, Modal, Input, Select, useToast } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { declarerIncidentPoeiAction, changerStatutIncidentPoeiAction } from '@/app/dashboard/poei/incident-actions'

export interface IncidentPoei {
  id: string
  date_incident: string
  type: string
  gravite: string
  titre: string
  description: string | null
  mesures_prises: string | null
  statut: string
  apprenant_id: string | null
  formateur_id: string | null
  created_at: string
}

const TYPES: { value: string; label: string }[] = [
  { value: 'comportement', label: 'Comportement' },
  { value: 'absence', label: 'Absence ou retard répété' },
  { value: 'accident', label: 'Accident' },
  { value: 'materiel', label: 'Matériel' },
  { value: 'securite', label: 'Sécurité' },
  { value: 'hygiene', label: 'Hygiène' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'autre', label: 'Autre' },
]

const GRAVITES: { value: string; label: string; classe: string }[] = [
  { value: 'mineur', label: 'Mineur', classe: 'bg-surface-100 text-surface-600' },
  { value: 'modere', label: 'Modéré', classe: 'bg-warning-50 text-warning-700' },
  { value: 'majeur', label: 'Majeur', classe: 'bg-danger-50 text-danger-700' },
  { value: 'critique', label: 'Critique', classe: 'bg-danger-100 text-danger-800' },
]

const STATUTS: Record<string, { label: string; classe: string }> = {
  ouvert: { label: 'Ouvert', classe: 'bg-danger-50 text-danger-700' },
  en_cours: { label: 'En cours de traitement', classe: 'bg-warning-50 text-warning-700' },
  resolu: { label: 'Résolu', classe: 'bg-success-50 text-success-700' },
  clos: { label: 'Clos', classe: 'bg-surface-100 text-surface-500' },
}

/**
 * Incidents d'un dossier POEI. Le formateur déclare depuis son espace, le
 * gestionnaire traite depuis la fiche : c'est le même composant des deux
 * côtés, seul `peutTraiter` change.
 */
export function PoeiIncidents({
  poeiId, incidents, candidats, peutTraiter,
}: {
  poeiId: string
  incidents: IncidentPoei[]
  candidats: { id: string; nom: string }[]
  /** L'équipe interne fait avancer le statut ; le formateur déclare seulement. */
  peutTraiter: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const ouverts = incidents.filter((i) => ['ouvert', 'en_cours'].includes(i.statut)).length

  async function declarer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const r = await declarerIncidentPoeiAction(poeiId, new FormData(e.currentTarget))
    setSaving(false)
    if (r.success) { toast('success', 'Incident déclaré'); setOpen(false); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  async function changer(id: string, statut: string) {
    setBusy(id)
    const r = await changerStatutIncidentPoeiAction(id, statut)
    setBusy(null)
    if (r.success) { toast('success', 'Incident mis à jour'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  const nomCandidat = (id: string | null) => candidats.find((c) => c.id === id)?.nom || null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-heading font-semibold text-surface-900 flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-brand-500" />
            Incidents{incidents.length > 0 ? ` (${incidents.length})` : ''}
          </h2>
          <p className="text-sm text-surface-500 mt-0.5">
            Comportement, absence, accident, matériel — tout ce qui doit être tracé et suivi.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" />}>Déclarer un incident</Button>
      </div>

      {ouverts > 0 && (
        <div className="card p-3.5 border-danger-200 bg-danger-50/40 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-danger-600 shrink-0" />
          <span className="text-sm text-surface-800">
            {ouverts} incident{ouverts > 1 ? 's' : ''} en attente de traitement
          </span>
        </div>
      )}

      {incidents.length === 0 ? (
        <div className="card p-10 text-center">
          <ShieldAlert className="h-9 w-9 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500">Aucun incident déclaré sur ce dossier.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {incidents.map((i) => {
            const g = GRAVITES.find((x) => x.value === i.gravite) || GRAVITES[0]
            const st = STATUTS[i.statut] || STATUTS.ouvert
            const qui = nomCandidat(i.apprenant_id)
            return (
              <div key={i.id} className={cn('card p-4', ['ouvert', 'en_cours'].includes(i.statut) && 'border-danger-200')}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-heading font-semibold text-surface-900">{i.titre}</span>
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', g.classe)}>{g.label}</span>
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', st.classe)}>{st.label}</span>
                    </div>
                    <div className="text-xs text-surface-500 mt-1">
                      {formatDate(i.date_incident)}
                      {' · '}{TYPES.find((t) => t.value === i.type)?.label || i.type}
                      {qui ? ` · ${qui}` : ''}
                    </div>
                    {i.description && <p className="text-sm text-surface-700 mt-2 whitespace-pre-line">{i.description}</p>}
                    {i.mesures_prises && (
                      <p className="text-sm text-surface-600 mt-2">
                        <span className="font-medium">Mesures prises : </span>{i.mesures_prises}
                      </p>
                    )}
                  </div>

                  {peutTraiter && !['clos'].includes(i.statut) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {i.statut === 'ouvert' && (
                        <button onClick={() => changer(i.id, 'en_cours')} disabled={busy === i.id}
                          className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs disabled:opacity-50">
                          <Clock className="h-3.5 w-3.5" /> Prendre en charge
                        </button>
                      )}
                      <button onClick={() => changer(i.id, 'resolu')} disabled={busy === i.id}
                        className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs disabled:opacity-50">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Résolu
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Déclarer un incident" size="lg">
        <form onSubmit={declarer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input id="titre" name="titre" label="Titre *" placeholder="Ex. Absence non justifiée répétée" required />
            <Input id="date_incident" name="date_incident" type="date" label="Date de l'incident"
              defaultValue={new Date().toISOString().slice(0, 10)} />
            <Select id="type" name="type" label="Type" options={TYPES} defaultValue="comportement" />
            <Select id="gravite" name="gravite" label="Gravité" options={GRAVITES.map((g) => ({ value: g.value, label: g.label }))} defaultValue="mineur" />
            <Select
              id="apprenant_id"
              name="apprenant_id"
              label="Candidat concerné"
              options={[{ value: '', label: '— Aucun en particulier —' }, ...candidats.map((c) => ({ value: c.id, label: c.nom }))]}
              defaultValue=""
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-surface-700 mb-1.5">Ce qui s&apos;est passé</label>
            <textarea id="description" name="description" rows={4} className="input-base w-full resize-none"
              placeholder="Décrivez les faits, sans interprétation : ce qui a été observé, quand, avec qui." />
          </div>
          <div>
            <label htmlFor="mesures_prises" className="block text-sm font-medium text-surface-700 mb-1.5">Mesures déjà prises</label>
            <textarea id="mesures_prises" name="mesures_prises" rows={2} className="input-base w-full resize-none"
              placeholder="Ce que vous avez fait sur le moment." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" isLoading={saving} icon={<AlertTriangle className="h-4 w-4" />}>Déclarer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
