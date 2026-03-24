import { getSession } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/permissions'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const { user, organization } = await getSession()
  const canEdit = isSuperAdmin(user.role)

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Paramètres</h1>
        <p className="text-surface-500 mt-1 text-sm">
          Informations de votre organisme de formation
        </p>
      </div>
      <SettingsForm organization={organization} canEdit={canEdit} />
    </div>
  )
}
