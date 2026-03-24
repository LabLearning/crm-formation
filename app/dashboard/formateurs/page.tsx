import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { FormateursList } from './FormateursList'
import type { Formateur } from '@/lib/types/formation'

export default async function FormateursPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: formateurs } = await supabase
    .from('formateurs')
    .select('*')
    .eq('organization_id', session.organization.id)
    .order('nom', { ascending: true })

  // Count sessions per formateur
  const sessionCounts: Record<string, number> = {}
  if (formateurs) {
    for (const f of formateurs) {
      const { count } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('formateur_id', f.id)
      sessionCounts[f.id] = count || 0
    }
  }

  return (
    <div className="animate-fade-in">
      <FormateursList
        formateurs={(formateurs || []) as Formateur[]}
        sessionCounts={sessionCounts}
      />
    </div>
  )
}
