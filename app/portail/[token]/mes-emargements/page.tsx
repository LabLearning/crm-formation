import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle, CheckSquare, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const CRENEAU: Record<string, string> = { matin: 'Matin', apres_midi: 'Après-midi', journee: 'Journée' }

/**
 * Émargements de l'apprenant sur son portail : sa présence par session,
 * demi-journée par demi-journée — la même donnée que la feuille du CRM.
 */
export default async function PortalEmargementsPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'apprenant') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()
  const { data: emargements } = await supabase
    .from('emargements')
    .select('id, session_id, date, creneau, est_present, motif_absence, session:session_id(reference, formation:formation_id(intitule))')
    .eq('apprenant_id', context.apprenant.id)
    .order('date', { ascending: false })

  const parSession = new Map<string, any[]>()
  for (const e of (emargements || []) as any[]) {
    if (!parSession.has(e.session_id)) parSession.set(e.session_id, [])
    parSession.get(e.session_id)!.push(e)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-heading font-bold text-surface-900">Mes émargements</h1>
        <p className="text-sm text-surface-500 mt-1">Votre présence en formation, demi-journée par demi-journée.</p>
      </div>

      {parSession.size === 0 && (
        <div className="card p-10 text-center text-sm text-surface-500">Aucun émargement pour le moment.</div>
      )}

      {[...parSession.entries()].map(([sessionId, lignes]) => {
        // Les créneaux pas encore passés (est_present null) ne comptent ni
        // en présence ni en absence — ils sont « à venir ».
        const faits = lignes.filter((l) => l.est_present !== null)
        const presents = faits.filter((l) => l.est_present).length
        return (
          <div key={sessionId} className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-3">
              <CheckSquare className="h-4 w-4 text-brand-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-heading font-semibold text-surface-900 truncate">
                  {lignes[0].session?.formation?.intitule || lignes[0].session?.reference || 'Formation'}
                </div>
              </div>
              <span className={`text-xs font-semibold tabular-nums shrink-0 ${presents === faits.length ? 'text-emerald-600' : 'text-amber-600'}`}>
                {presents}/{faits.length || lignes.length} présent{presents > 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-surface-50">
              {lignes.map((l) => (
                <div key={l.id} className="px-4 py-2.5 flex items-center gap-3">
                  {l.est_present
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : l.est_present === false
                    ? <XCircle className="h-4 w-4 text-surface-300 shrink-0" />
                    : <Clock className="h-4 w-4 text-surface-300 shrink-0" />}
                  <span className="text-sm text-surface-900">
                    {formatDate(l.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-surface-500">{CRENEAU[l.creneau] || l.creneau}</span>
                  <span className={`ml-auto text-xs font-medium ${l.est_present ? 'text-emerald-600' : 'text-surface-400'}`}>
                    {l.est_present ? 'Présent' : l.est_present === false ? (l.motif_absence ? `Absent · ${l.motif_absence}` : 'Absent') : 'À venir'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
