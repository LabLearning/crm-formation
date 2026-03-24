'use client'

import { useState } from 'react'
import { Save, Building2, ShieldCheck } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { updateOrganizationAction } from './actions'
import type { Organization } from '@/lib/types'

interface SettingsFormProps {
  organization: Organization
  canEdit: boolean
}

export function SettingsForm({ organization, canEdit }: SettingsFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isQualiopi, setIsQualiopi] = useState(organization.is_qualiopi)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canEdit) return

    setIsLoading(true)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    formData.set('is_qualiopi', String(isQualiopi))

    const result = await updateOrganizationAction(formData)

    if (result.success) {
      toast('success', 'Paramètres enregistrés avec succès')
    } else if (result.errors) {
      setFieldErrors(result.errors)
    } else {
      toast('error', result.error || 'Erreur lors de la mise à jour')
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Informations générales */}
      <section className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-surface-100 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-surface-600" />
          </div>
          <div>
            <h2 className="text-sm font-heading font-semibold text-surface-900 tracking-tight">
              Informations de l&apos;organisme
            </h2>
            <p className="text-xs text-surface-500">
              Ces informations apparaîtront sur vos documents officiels
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            id="name"
            name="name"
            label="Nom de l'organisme"
            defaultValue={organization.name}
            error={fieldErrors.name?.[0]}
            disabled={!canEdit}
          />
          <Input
            id="legal_name"
            name="legal_name"
            label="Raison sociale"
            defaultValue={organization.legal_name || ''}
            error={fieldErrors.legal_name?.[0]}
            disabled={!canEdit}
          />
          <Input
            id="siret"
            name="siret"
            label="SIRET"
            placeholder="12345678901234"
            defaultValue={organization.siret || ''}
            error={fieldErrors.siret?.[0]}
            disabled={!canEdit}
          />
          <Input
            id="numero_da"
            name="numero_da"
            label="N° Déclaration d'Activité"
            placeholder="11 75 XXXXX 75"
            defaultValue={organization.numero_da || ''}
            disabled={!canEdit}
          />
          <Input
            id="email"
            name="email"
            type="email"
            label="Email de contact"
            defaultValue={organization.email || ''}
            error={fieldErrors.email?.[0]}
            disabled={!canEdit}
          />
          <Input
            id="phone"
            name="phone"
            label="Téléphone"
            defaultValue={organization.phone || ''}
            disabled={!canEdit}
          />
          <Input
            id="website"
            name="website"
            label="Site web"
            placeholder="https://"
            defaultValue={organization.website || ''}
            error={fieldErrors.website?.[0]}
            disabled={!canEdit}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input
            id="address"
            name="address"
            label="Adresse"
            defaultValue={organization.address || ''}
            disabled={!canEdit}
          />
          <Input
            id="postal_code"
            name="postal_code"
            label="Code postal"
            defaultValue={organization.postal_code || ''}
            disabled={!canEdit}
          />
          <Input
            id="city"
            name="city"
            label="Ville"
            defaultValue={organization.city || ''}
            disabled={!canEdit}
          />
        </div>
      </section>

      {/* Qualiopi */}
      <section className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-surface-100 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-surface-600" />
          </div>
          <div>
            <h2 className="text-sm font-heading font-semibold text-surface-900 tracking-tight">
              Certification Qualiopi
            </h2>
            <p className="text-xs text-surface-500">
              Indiquez si votre organisme est certifié Qualiopi
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={isQualiopi}
              onChange={(e) => setIsQualiopi(e.target.checked)}
              disabled={!canEdit}
              className="sr-only peer"
            />
            <div className="w-10 h-[22px] bg-surface-200 rounded-full peer-checked:bg-surface-900 transition-colors duration-200" />
            <div className="absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-xs transition-transform duration-200 peer-checked:translate-x-[18px]" />
          </div>
          <span className="text-sm text-surface-700 font-medium group-hover:text-surface-900 transition-colors">
            Organisme certifié Qualiopi
          </span>
        </label>
      </section>

      {/* Submit */}
      {canEdit && (
        <div className="flex justify-end">
          <Button
            type="submit"
            isLoading={isLoading}
            icon={<Save className="h-4 w-4" />}
          >
            Enregistrer les modifications
          </Button>
        </div>
      )}
    </form>
  )
}
