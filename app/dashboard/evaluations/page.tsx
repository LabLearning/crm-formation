import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchAllPaged } from '@/lib/supabase/fetch-all'
import { EvaluationsDashboard } from './EvaluationsDashboard'
import type { QCMReponse, EvaluationSatisfaction } from '@/lib/types/evaluation'

export default async function EvaluationsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  // Pagination complète : qcm_reponses dépasse 1000 lignes → sans cela les KPIs
  // (moyenne, taux de réussite, comptages) seraient calculés sur un échantillon tronqué.
  const [reponses, satisfactions] = await Promise.all([
    fetchAllPaged((from, to) => supabase
      .from('qcm_reponses')
      .select(`
        *,
        apprenant:apprenants(prenom, nom, email),
        qcm:qcm(titre, type, score_min_reussite)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, to)),
    fetchAllPaged((from, to) => supabase
      .from('evaluations_satisfaction')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, to)),
  ])

  return (
    <div className="animate-fade-in">
      <EvaluationsDashboard
        reponses={(reponses || []) as QCMReponse[]}
        satisfactions={(satisfactions || []) as EvaluationSatisfaction[]}
      />
    </div>
  )
}
