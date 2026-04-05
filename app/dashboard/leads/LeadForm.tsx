'use client'

import { useState } from 'react'
import { Save, AlertCircle } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { createLeadAction, updateLeadAction } from './actions'
import { LEAD_SOURCE_LABELS } from '@/lib/types/crm'
import type { Lead } from '@/lib/types/crm'
import type { User } from '@/lib/types'

interface Formation {
  id: string
  intitule: string
  prix_ht: number | null
}

interface LeadFormProps {
  lead?: Lead
  users: Pick<User, 'id' | 'first_name' | 'last_name'>[]
  formations?: Formation[]
  isApporteur?: boolean
  hideAssign?: boolean
  onSuccess: () => void
  onCancel: () => void
}

const sourceOptions = Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label }))

export function LeadForm({ lead, users, formations = [], isApporteur, hideAssign, onSuccess, onCancel }: LeadFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [selectedFormation, setSelectedFormation] = useState('')
  const [isCustomFormation, setIsCustomFormation] = useState(false)

  const userOptions = users.map((u) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`,
  }))

  const formationOptions = [
    ...formations.map((f) => ({ value: f.id, label: f.intitule })),
    { value: '__custom', label: 'Autre (formation spéciale)' },
  ]

  function handleFormationChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setSelectedFormation(val)
    setIsCustomFormation(val === '__custom')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setFieldErrors({})
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Pour l'apporteur, calculer le montant depuis la formation sélectionnée
    if (isApporteur && selectedFormation && selectedFormation !== '__custom') {
      const formation = formations.find(f => f.id === selectedFormation)
      if (formation?.prix_ht) {
        const nbStagiaires = parseInt(formData.get('nombre_stagiaires') as string) || 1
        formData.set('montant_estime', String(formation.prix_ht * nbStagiaires))
      }
      formData.set('formation_souhaitee', formation?.intitule || '')
    }

    const result = lead
      ? await updateLeadAction(lead.id, formData)
      : await createLeadAction(formData)

    if (result.success) {
      onSuccess()
    } else if (result.errors) {
      setFieldErrors(result.errors)
    } else {
      setError(result.error || 'Erreur')
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* ── Contact ── */}
      <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Contact</div>

      <div className="grid grid-cols-2 gap-4">
        <Input id="contact_prenom" name="contact_prenom" label="Prénom" defaultValue={lead?.contact_prenom || ''} error={fieldErrors.contact_prenom?.[0]} />
        <Input id="contact_nom" name="contact_nom" label="Nom *" defaultValue={lead?.contact_nom || ''} error={fieldErrors.contact_nom?.[0]} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input id="contact_email" name="contact_email" type="email" label="Email" defaultValue={lead?.contact_email || ''} error={fieldErrors.contact_email?.[0]} />
        <Input id="contact_telephone" name="contact_telephone" label="Téléphone" defaultValue={lead?.contact_telephone || ''} />
      </div>

      <Input id="contact_poste" name="contact_poste" label="Poste / Fonction" defaultValue={lead?.contact_poste || ''} />

      {/* ── Entreprise ── */}
      <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider pt-2">Entreprise</div>

      <div className="grid grid-cols-2 gap-4">
        <Input id="entreprise" name="entreprise" label="Nom de l'entreprise" defaultValue={lead?.entreprise || ''} />
        <Input id="siret" name="siret" label="SIRET" defaultValue={lead?.siret || ''} />
      </div>

      {/* ── Formation (apporteur) ── */}
      {isApporteur ? (
        <>
          <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider pt-2">Formation</div>

          <div className="flex flex-col gap-1">
            <label htmlFor="formation_id" className="text-sm font-medium text-surface-700">
              Formation souhaitée *
            </label>
            <select
              id="formation_id"
              name="formation_id"
              value={selectedFormation}
              onChange={handleFormationChange}
              className="input-base"
            >
              <option value="">Sélectionner une formation</option>
              {formationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {isCustomFormation && (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Cette demande sera transmise au directeur commercial pour validation.</span>
              </div>
              <Input
                id="formation_souhaitee"
                name="formation_souhaitee"
                label="Décrivez la formation souhaitée *"
                defaultValue=""
                placeholder="Ex : Formation spécifique en pâtisserie vegan..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input id="nombre_stagiaires" name="nombre_stagiaires" type="number" label="Nombre de stagiaires" defaultValue={lead?.nombre_stagiaires?.toString() || ''} placeholder="1" />
            <Input id="date_souhaitee" name="date_souhaitee" type="date" label="Date souhaitée" defaultValue={lead?.date_souhaitee || ''} />
          </div>
        </>
      ) : (
        <>
          {/* ── Qualification (admin/commercial) ── */}
          <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider pt-2">Qualification</div>

          <div className="grid grid-cols-2 gap-4">
            <Select id="source" name="source" label="Source *" options={sourceOptions} defaultValue={lead?.source || 'autre'} error={fieldErrors.source?.[0]} />
            <Input id="montant_estime" name="montant_estime" type="number" label="Montant estimé (€)" defaultValue={lead?.montant_estime?.toString() || ''} placeholder="0" />
          </div>

          <Input id="formation_souhaitee" name="formation_souhaitee" label="Formation souhaitée" defaultValue={lead?.formation_souhaitee || ''} />

          <div className="grid grid-cols-2 gap-4">
            <Input id="nombre_stagiaires" name="nombre_stagiaires" type="number" label="Nombre de stagiaires" defaultValue={lead?.nombre_stagiaires?.toString() || ''} />
            <Input id="date_souhaitee" name="date_souhaitee" type="date" label="Date souhaitée" defaultValue={lead?.date_souhaitee || ''} />
          </div>
        </>
      )}

      {/* ── Assigné à (admin/commercial) ── */}
      {!hideAssign && (
        <Select id="assigned_to" name="assigned_to" label="Assigné à" options={userOptions} defaultValue={lead?.assigned_to || ''} placeholder="Sélectionner un responsable" />
      )}

      {/* ── Commentaire ── */}
      <div>
        <label htmlFor="commentaire" className="text-sm font-medium text-surface-700">
          Commentaire
        </label>
        <textarea
          id="commentaire"
          name="commentaire"
          rows={3}
          className="input-base resize-none mt-1.5"
          defaultValue={lead?.commentaire || ''}
          placeholder={isApporteur ? 'Informations complémentaires pour l\'équipe commerciale...' : 'Notes internes sur ce lead...'}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" isLoading={isLoading} icon={<Save className="h-4 w-4" />}>
          {lead ? 'Mettre à jour' : isApporteur ? 'Soumettre le lead' : 'Créer le lead'}
        </Button>
      </div>
    </form>
  )
}
