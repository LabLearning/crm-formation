import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui'
import { QCM_TYPE_LABELS, QCM_TYPE_COLORS, QCM_TYPE_QUALIOPI } from '@/lib/types/evaluation'
import { formatDate } from '@/lib/utils'
import { ListChecks, Clock, CheckCircle2 } from 'lucide-react'
import type { QCMType } from '@/lib/types/evaluation'

export default async function PortalQuestionnairesPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'apprenant') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()

  const { data: reponses } = await supabase
    .from('qcm_reponses')
    .select(`
      *,
      qcm:qcm(titre, type, description, duree_minutes, questions:qcm_questions(count))
    `)
    .eq('apprenant_id', context.apprenant.id)
    .order('created_at', { ascending: false })

  const pending = (reponses || []).filter((r) => !r.is_complete)
  const completed = (reponses || []).filter((r) => r.is_complete)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Mes questionnaires</h1>
        <p className="text-surface-500 mt-1">QCM et questionnaires de satisfaction</p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-warning-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> À compléter ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="card p-5 border-warning-200 border hover:shadow-card transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={QCM_TYPE_COLORS[r.qcm?.type as QCMType]}>{QCM_TYPE_LABELS[r.qcm?.type as QCMType]}</Badge>
                      <span className="text-2xs text-surface-400">{QCM_TYPE_QUALIOPI[r.qcm?.type as QCMType]}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-surface-900">{r.qcm?.titre || 'Questionnaire'}</h3>
                    {r.qcm?.description && <p className="text-xs text-surface-500 mt-0.5">{r.qcm.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
                      {r.qcm?.duree_minutes && <span>{r.qcm.duree_minutes} minutes</span>}
                      <span>Envoyé le {formatDate(r.created_at, { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="px-4 py-2 rounded-xl bg-warning-100 text-warning-700 text-sm font-medium">
                      Répondre
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-success-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Complétés ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={QCM_TYPE_COLORS[r.qcm?.type as QCMType]}>{QCM_TYPE_LABELS[r.qcm?.type as QCMType]}</Badge>
                    </div>
                    <h3 className="text-sm font-medium text-surface-800">{r.qcm?.titre}</h3>
                    <div className="text-xs text-surface-500 mt-0.5">
                      Complété le {r.completed_at && formatDate(r.completed_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                      {r.duree_secondes && ` · ${Math.floor(r.duree_secondes / 60)}min`}
                    </div>
                  </div>
                  <div className="text-right">
                    {r.score !== null && (
                      <div className={`text-xl font-heading font-bold ${Number(r.score) >= 70 ? 'text-success-600' : 'text-warning-600'}`}>
                        {r.score}%
                      </div>
                    )}
                    {r.is_reussi !== null && (
                      <div className={`text-xs ${r.is_reussi ? 'text-success-600' : 'text-danger-600'}`}>
                        {r.is_reussi ? 'Réussi' : 'Non réussi'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(reponses || []).length === 0 && (
        <div className="card p-12 text-center">
          <ListChecks className="h-8 w-8 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500">Aucun questionnaire pour le moment</p>
        </div>
      )}
    </div>
  )
}
