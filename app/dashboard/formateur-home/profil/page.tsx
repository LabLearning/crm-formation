import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfilForm } from './ProfilForm'

export default async function ProfilFormateurPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: formateur } = await supabase
    .from('formateurs')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (!formateur) redirect('/dashboard/formateur-home')

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Mon profil</h1>
        <p className="text-surface-500 mt-1 text-sm">Gérez vos informations, compétences et tarifs</p>
      </div>
      <ProfilForm formateur={formateur as any} />
    </div>
  )
}
