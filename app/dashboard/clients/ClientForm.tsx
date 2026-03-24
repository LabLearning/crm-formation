'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { createClientAction, updateClientAction } from './actions'
import { CLIENT_TYPE_LABELS, FINANCEUR_LABELS } from '@/lib/types/crm'
import type { Client } from '@/lib/types/crm'

interface ClientFormProps {
  client?: Client
  onSuccess: () => void
  onCancel: () => void
}

const typeOptions = Object.entries(CLIENT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))
const financeurOptions = [{ value: '', label: 'Aucun' }, ...Object.entries(FINANCEUR_LABELS).map(([v, l]) => ({ value: v, label: l }))]
const tailleOptions = [
  { value: '', label: 'Non renseignée' },
  { value: 'TPE', label: 'TPE (< 10 salariés)' },
  { value: 'PME', label: 'PME (10-249)' },
  { value: 'ETI', label: 'ETI (250-4999)' },
  { value: 'GE', label: 'Grande entreprise (5000+)' },
]

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [clientType, setClientType] = useState(client?.type || 'entreprise')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setFieldErrors({})
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('type', clientType)

    const result = client
      ? await updateClientAction(client.id, formData)
      : await createClientAction(formData)

    if (result.success) {
      onSuccess()
    } else if (result.errors) {
      setFieldErrors(result.errors)
    }
    if (result.error) {
      setError(result.error)
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

      <Select
        id="type"
        name="type"
        label="Type de client *"
        options={typeOptions}
        value={clientType}
        onChange={(e) => setClientType(e.target.value as 'entreprise' | 'particulier')}
      />

      {clientType === 'entreprise' ? (
        <>
          <Input id="raison_sociale" name="raison_sociale" label="Raison sociale *" defaultValue={client?.raison_sociale || ''} error={fieldErrors.raison_sociale?.[0]} />
          <div className="grid grid-cols-2 gap-4">
            <Input id="siret" name="siret" label="SIRET" defaultValue={client?.siret || ''} error={fieldErrors.siret?.[0]} placeholder="14 chiffres" />
            <Input id="code_naf" name="code_naf" label="Code NAF" defaultValue={client?.code_naf || ''} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="secteur_activite" name="secteur_activite" label="Secteur d'activité" defaultValue={client?.secteur_activite || ''} />
            <Select id="taille_entreprise" name="taille_entreprise" label="Taille" options={tailleOptions} defaultValue={client?.taille_entreprise || ''} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Select id="civilite" name="civilite" label="Civilité" options={[{ value: '', label: '—' }, { value: 'M.', label: 'M.' }, { value: 'Mme', label: 'Mme' }]} defaultValue={client?.civilite || ''} />
            <Input id="prenom" name="prenom" label="Prénom *" defaultValue={client?.prenom || ''} />
            <Input id="nom" name="nom" label="Nom *" defaultValue={client?.nom || ''} />
          </div>
        </>
      )}

      <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider pt-2">Coordonnées</div>

      <div className="grid grid-cols-2 gap-4">
        <Input id="email" name="email" type="email" label="Email" defaultValue={client?.email || ''} error={fieldErrors.email?.[0]} />
        <Input id="telephone" name="telephone" label="Téléphone" defaultValue={client?.telephone || ''} />
      </div>

      <Input id="adresse" name="adresse" label="Adresse" defaultValue={client?.adresse || ''} />
      <div className="grid grid-cols-2 gap-4">
        <Input id="code_postal" name="code_postal" label="Code postal" defaultValue={client?.code_postal || ''} />
        <Input id="ville" name="ville" label="Ville" defaultValue={client?.ville || ''} />
      </div>

      <Input id="site_web" name="site_web" label="Site web" defaultValue={client?.site_web || ''} placeholder="https://" error={fieldErrors.site_web?.[0]} />

      <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider pt-2">Financement</div>

      <div className="grid grid-cols-2 gap-4">
        <Select id="financeur_type" name="financeur_type" label="Type de financeur" options={financeurOptions} defaultValue={client?.financeur_type || ''} />
        <Input id="numero_opco" name="numero_opco" label="N° OPCO" defaultValue={client?.numero_opco || ''} />
      </div>

      <textarea id="notes" name="notes" rows={3} className="input-base resize-none" placeholder="Notes internes..." defaultValue={client?.notes || ''} />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" isLoading={isLoading} icon={<Save className="h-4 w-4" />}>
          {client ? 'Mettre à jour' : 'Créer le client'}
        </Button>
      </div>
    </form>
  )
}
