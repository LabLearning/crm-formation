import { getSession } from '@/lib/auth'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const { user } = await getSession()

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Mon profil</h1>
        <p className="text-surface-500 mt-1 text-sm">Gérez vos informations personnelles</p>
      </div>

      <ProfileForm user={user} />
    </div>
  )
}
