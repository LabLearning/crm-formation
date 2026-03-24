'use client'

import { useState } from 'react'
import { Save, User as UserIcon } from 'lucide-react'
import { Button, Input, Avatar, Badge, useToast } from '@/components/ui'
import { updateProfileAction } from './actions'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import type { User } from '@/lib/types'

interface ProfileFormProps {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateProfileAction(formData)

    if (result.success) {
      toast('success', 'Profil mis à jour')
    } else {
      toast('error', result.error || 'Erreur')
    }

    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <Avatar
          firstName={user.first_name}
          lastName={user.last_name}
          src={user.avatar_url}
          size="xl"
        />
        <div>
          <h2 className="text-xl font-heading font-bold text-surface-900">
            {user.first_name} {user.last_name}
          </h2>
          <p className="text-sm text-surface-500 mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={ROLE_COLORS[user.role]} dot>
              {ROLE_LABELS[user.role]}
            </Badge>
            <span className="text-xs text-surface-400">
              Membre depuis {formatDate(user.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-surface-100 flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-surface-600" />
          </div>
          <div>
            <h2 className="text-sm font-heading font-semibold text-surface-900 tracking-tight">
              Informations personnelles
            </h2>
            <p className="text-xs text-surface-500">
              Modifiez vos informations de profil
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            id="first_name"
            name="first_name"
            label="Prénom"
            defaultValue={user.first_name}
          />
          <Input
            id="last_name"
            name="last_name"
            label="Nom"
            defaultValue={user.last_name}
          />
          <Input
            id="email"
            name="email"
            label="Email"
            value={user.email}
            disabled
            hint="L'email ne peut pas être modifié"
          />
          <Input
            id="phone"
            name="phone"
            label="Téléphone"
            defaultValue={user.phone || ''}
          />
        </div>

        <div className="flex justify-end mt-6">
          <Button
            type="submit"
            isLoading={isLoading}
            icon={<Save className="h-4 w-4" />}
          >
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  )
}
