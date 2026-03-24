import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge, Avatar } from '@/components/ui'
import { INSCRIPTION_STATUS_LABELS, INSCRIPTION_STATUS_COLORS } from '@/lib/types/formation'
import { Accessibility, Mail, Building2 } from 'lucide-react'
import type { InscriptionStatus } from '@/lib/types/formation'

export default async function PortalApprenantsPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'formateur') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()

  // Get all sessions for this formateur
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, reference, date_debut, date_fin, formation:formations(intitule)')
    .eq('formateur_id', context.formateur.id)
    .in('status', ['confirmee', 'en_cours', 'planifiee'])
    .order('date_debut', { ascending: true })

  const sessionIds = (sessions || []).map((s) => s.id)
  let inscriptions: any[] = []

  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('inscriptions')
      .select(`
        *,
        apprenant:apprenants(prenom, nom, email, entreprise, situation_handicap, type_handicap, besoins_adaptation),
        session:sessions(reference, formation:formations(intitule))
      `)
      .in('session_id', sessionIds)
      .not('status', 'in', '("annule")')
      .order('session_id')
    inscriptions = data || []
  }

  // Group by session
  const bySession = (sessions || []).map((s) => ({
    ...s,
    inscriptions: inscriptions.filter((i) => i.session_id === s.id),
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Mes apprenants</h1>
        <p className="text-surface-500 mt-1">{inscriptions.length} apprenant{inscriptions.length > 1 ? 's' : ''} inscrit{inscriptions.length > 1 ? 's' : ''}</p>
      </div>

      {bySession.filter((s) => s.inscriptions.length > 0).map((session) => (
        <div key={session.id} className="card overflow-hidden">
          <div className="px-6 py-4 bg-surface-50 border-b border-surface-200">
            <div className="text-sm font-semibold text-surface-900">
              {session.formation?.intitule || session.reference || 'Session'}
            </div>
            <div className="text-xs text-surface-500">{session.reference} · {session.inscriptions.length} apprenant{session.inscriptions.length > 1 ? 's' : ''}</div>
          </div>
          <div className="divide-y divide-surface-100">
            {session.inscriptions.map((ins: any) => (
              <div key={ins.id} className="px-6 py-3.5 flex items-center gap-4">
                <Avatar firstName={ins.apprenant?.prenom || ''} lastName={ins.apprenant?.nom || ''} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-900 flex items-center gap-1.5">
                    {ins.apprenant?.prenom} {ins.apprenant?.nom}
                    {ins.apprenant?.situation_handicap && (
                      <Accessibility className="h-3.5 w-3.5 text-brand-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-surface-500">
                    {ins.apprenant?.email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{ins.apprenant.email}</span>}
                    {ins.apprenant?.entreprise && <span className="flex items-center gap-0.5"><Building2 className="h-3 w-3" />{ins.apprenant.entreprise}</span>}
                  </div>
                  {/* Show handicap adaptation needs to formateur */}
                  {ins.apprenant?.situation_handicap && ins.apprenant?.besoins_adaptation && (
                    <div className="mt-1 text-xs text-brand-600 bg-brand-50 rounded-lg px-2 py-1 inline-block">
                      Adaptations : {ins.apprenant.besoins_adaptation}
                    </div>
                  )}
                </div>
                <Badge variant={INSCRIPTION_STATUS_COLORS[ins.status as InscriptionStatus]}>
                  {INSCRIPTION_STATUS_LABELS[ins.status as InscriptionStatus]}
                </Badge>
                {ins.taux_assiduite > 0 && (
                  <div className="text-right shrink-0">
                    <div className="text-xs text-surface-400">Assiduité</div>
                    <div className="text-sm font-bold text-surface-800">{ins.taux_assiduite}%</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {inscriptions.length === 0 && (
        <div className="card p-12 text-center text-sm text-surface-500">Aucun apprenant inscrit à vos sessions</div>
      )}
    </div>
  )
}
