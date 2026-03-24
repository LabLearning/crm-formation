import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { QCMList } from './QCMList'
import type { QCM } from '@/lib/types/evaluation'

export default async function QCMPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: qcms } = await supabase
    .from('qcm')
    .select(`
      *,
      formation:formations(intitule, reference),
      questions:qcm_questions(*, choix:qcm_choix(*))
    `)
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  // Count responses per QCM
  const qcmsWithCounts = await Promise.all(
    (qcms || []).map(async (q) => {
      const { count } = await supabase
        .from('qcm_reponses')
        .select('*', { count: 'exact', head: true })
        .eq('qcm_id', q.id)
        .eq('is_complete', true)
      return { ...q, _reponses_count: count || 0 }
    })
  )

  const { data: formations } = await supabase
    .from('formations')
    .select('id, intitule')
    .eq('organization_id', session.organization.id)
    .eq('is_active', true)

  return (
    <div className="animate-fade-in">
      <QCMList
        qcms={qcmsWithCounts as QCM[]}
        formations={formations || []}
      />
    </div>
  )
}
