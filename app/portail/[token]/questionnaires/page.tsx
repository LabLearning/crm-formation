import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuestionnairesClient from './QuestionnairesClient'

// Donnees temps reel : jamais de cache statique (acces par token, sans cookies)
export const dynamic = 'force-dynamic'

export default async function PortalQuestionnairesPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'apprenant') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()

  // Pending QCMs with full questions + choices for the player + Completed QCMs (summary only)
  const [{ data: pendingReponses }, { data: completedReponses }] = await Promise.all([
    supabase
      .from('qcm_reponses')
      .select(`
      *,
      qcm:qcm(
        titre, type, description, duree_minutes, score_min_reussite,
        questions:qcm_questions(
          id, texte, type, position, points, explication,
          choix:qcm_choix(id, texte, est_correct, position)
        )
      )
    `)
      .eq('apprenant_id', context.apprenant.id)
      .eq('is_complete', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('qcm_reponses')
      .select(`
      *,
      qcm:qcm(titre, type, score_min_reussite)
    `)
      .eq('apprenant_id', context.apprenant.id)
      .eq('is_complete', true)
      .order('completed_at', { ascending: false }),
  ])

  // Le questionnaire à froid mesure ce qui reste appliqué trois mois après :
  // il est verrouillé jusqu'à J+90 après la fin de session.
  const sessionIds = [...new Set((pendingReponses || []).map((r: any) => r.session_id).filter(Boolean))]
  const { data: sessionsFin } = sessionIds.length
    ? await supabase.from('sessions').select('id, date_fin').in('id', sessionIds)
    : { data: [] as any[] }
  const finPar = new Map((sessionsFin || []).map((s: any) => [s.id, s.date_fin]))
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const pendingAvecVerrou = (pendingReponses || []).map((r: any) => {
    if (r.qcm?.type !== 'satisfaction_froid') return r
    const fin = finPar.get(r.session_id)
    if (!fin) return r
    const dispo = new Date(fin + 'T00:00:00Z')
    dispo.setUTCDate(dispo.getUTCDate() + 90)
    const dispoStr = dispo.toISOString().slice(0, 10)
    return dispoStr > aujourdhui ? { ...r, _disponible_le: dispoStr } : r
  })

  return (
    <QuestionnairesClient
      token={params.token}
      pendingReponses={pendingAvecVerrou as any[]}
      completedReponses={(completedReponses || []) as any[]}
    />
  )
}
