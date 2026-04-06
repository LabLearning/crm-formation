import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlanningCalendar } from './PlanningCalendar'

export default async function PlanningFormateurPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!formateur) redirect('/dashboard/formateur-home')

  // Disponibilités sur les 6 prochains mois
  const now = new Date()
  const sixMonths = new Date(now.getFullYear(), now.getMonth() + 6, 1)

  const { data: dispos } = await supabase
    .from('formateur_disponibilites')
    .select('id, date, type, creneau')
    .eq('formateur_id', formateur.id)
    .gte('date', now.toISOString().split('T')[0])
    .lte('date', sixMonths.toISOString().split('T')[0])

  // Sessions planifiées
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, reference, date_debut, date_fin, lieu, status, formation:formations(intitule)')
    .eq('formateur_id', formateur.id)
    .not('status', 'eq', 'annulee')
    .gte('date_fin', now.toISOString().split('T')[0])

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Mon planning</h1>
        <p className="text-surface-500 mt-1 text-sm">Gérez vos disponibilités et consultez vos sessions</p>
      </div>
      <PlanningCalendar
        disponibilites={(dispos || []) as any[]}
        sessions={(sessions || []) as any[]}
      />
    </div>
  )
}
