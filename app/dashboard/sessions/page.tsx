import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { SessionsList } from './SessionsList'
import type { Session, Formation, Formateur } from '@/lib/types/formation'

export default async function SessionsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      *,
      formation:formations(intitule, reference, modalite, duree_heures),
      formateur:formateurs(prenom, nom)
    `)
    .eq('organization_id', session.organization.id)
    .order('date_debut', { ascending: false })

  // Count inscriptions per session
  const sessionsWithCounts = await Promise.all(
    (sessions || []).map(async (s) => {
      const { count } = await supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', s.id)
        .not('status', 'in', '("annule","abandonne")')
      return { ...s, _nb_inscrits: count || 0 }
    })
  )

  const { data: formations } = await supabase
    .from('formations')
    .select('id, intitule, reference, modalite, duree_heures')
    .eq('organization_id', session.organization.id)
    .eq('is_active', true)
    .order('intitule')

  const { data: formateurs } = await supabase
    .from('formateurs')
    .select('id, prenom, nom')
    .eq('organization_id', session.organization.id)
    .eq('is_active', true)
    .order('nom')

  return (
    <div className="animate-fade-in">
      <SessionsList
        sessions={sessionsWithCounts as Session[]}
        formations={(formations || []) as any[]}
        formateurs={(formateurs || []) as any[]}
      />
    </div>
  )
}
