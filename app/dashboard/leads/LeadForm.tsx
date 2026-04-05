'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { createLeadAction, updateLeadAction } from './actions'
import { LEAD_SOURCE_LABELS } from '@/lib/types/crm'
import type { Lead } from '@/lib/types/crm'
import type { User } from '@/lib/types'

interface LeadFormProps {
  lead?: Lead
  users: Pick<User, 'id' | 'first_name' | 'last_name'>[]
  hideAssign?: boolean
  onSuccess: () => void
  onCancel: () => void
}

const sourceOptions = Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label }))

export function LeadForm({ lead, users, hideAssign, onSuccess, onCancel }: LeadFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)

  const userOptions = users.map((u) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`,
  }))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setFieldErrors({})
    setError(null)

    const formData = new FormData(e.currentTarget)

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

      <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Contact</div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="contact_prenom"
          name="contact_prenom"
          label="Prénom"
          defaultValue={lead?.contact_prenom || ''}
          error={fieldErrors.contact_prenom?.[0]}
        />
        <Input
          id="contact_nom"
          name="contact_nom"
          label="Nom *"
          defaultValue={lead?.contact_nom || ''}
          error={fieldErrors.contact_nom?.[0]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="contact_email"
          name="contact_email"
          type="email"
          label="Email"
          defaultValue={lead?.contact_email || ''}
          error={fieldErrors.contact_email?.[0]}
        />
        <Input
          id="contact_telephone"
          name="contact_telephone"
          label="Téléphone"
          defaultValue={lead?.contact_telephone || ''}
        />
      </div>

      <Input
        id="contact_poste"
        name="contact_poste"
        label="Poste / Fonction"
        defaultValue={lead?.contact_poste || ''}
      />

      <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider pt-2">Entreprise</div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="entreprise"
          name="entreprise"
          label="Nom de l'entreprise"
          defaultValue={lead?.entreprise || ''}
        />
        <Input
          id="siret"
          name="siret"
          label="SIRET"
          defaultValue={lead?.siret || ''}
        />
      </div>

      <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider pt-2">Qualification</div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          id="source"
          name="source"
          label="Source *"
          options={sourceOptions}
          defaultValue={lead?.source || 'autre'}
          error={fieldErrors.source?.[0]}
        />
        <Input
          id="montant_estime"
          name="montant_estime"
          type="number"
          label="Montant estimé (€)"
          defaultValue={lead?.montant_estime?.toString() || ''}
          placeholder="0"
        />
      </div>

      <Input
        id="formation_souhaitee"
        name="formation_souhaitee"
        label="Formation souhaitée"
        defaultValue={lead?.formation_souhaitee || ''}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="nombre_stagiaires"
          name="nombre_stagiaires"
          type="number"
          label="Nombre de stagiaires"
          defaultValue={lead?.nombre_stagiaires?.toString() || ''}
        />
        <Input
          id="date_souhaitee"
          name="date_souhaitee"
          type="date"
          label="Date souhaitée"
          defaultValue={lead?.date_souhaitee || ''}
        />
      </div>

      {!hideAssign && (
        <Select
          id="assigned_to"
          name="assigned_to"
          label="Assigné à"
          options={userOptions}
          defaultValue={lead?.assigned_to || ''}
          placeholder="Sélectionner un responsable"
        />
      )}

      <div className="flex items-center gap-2 pt-2">
        <label htmlFor="commentaire" className="text-sm font-medium text-surface-700">
          Commentaire
        </label>
      </div>
      <textarea
        id="commentaire"
        name="commentaire"
        rows={3}
        className="input-base resize-none"
        defaultValue={lead?.commentaire || ''}
        placeholder="Notes internes sur ce lead..."
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" isLoading={isLoading} icon={<Save className="h-4 w-4" />}>
          {lead ? 'Mettre à jour' : 'Créer le lead'}
        </Button>
      </div>
    </form>
  )
}
