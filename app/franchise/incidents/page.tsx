import { getFranchiseSession } from '@/lib/franchise-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { AlertTriangle, Building2 } from 'lucide-react'
import { INCIDENT_TYPES, GRAVITE_META, STATUT_META } from '@/lib/incidents'

export const dynamic = 'force-dynamic'

export default async function FranchiseIncidentsPage() {
  const { franchise, organization } = await getFranchiseSession()
  const supabase = await createServiceRoleClient()

  const { data: incidents } = await supabase
    .from('incidents')
    .select('id, date_incident, type, gravite, titre, description, mesures_prises, statut, client:clients(raison_sociale), session:sessions(reference)')
    .eq('franchise_id', franchise.id)
    .eq('organization_id', organization.id)
    .order('date_incident', { ascending: false })

  const list = incidents || []
  const actifs = list.filter((i) => i.statut === 'ouvert' || i.statut === 'en_cours').length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Rapports d'incident</h1>
          <p className="text-surface-500 text-sm mt-1">Incidents survenus pendant les formations de votre réseau.</p>
        </div>
        {actifs > 0 && (
          <div className="card px-4 py-2 inline-flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <div>
              <div className="text-lg font-heading font-bold text-surface-900 leading-none">{actifs}</div>
              <div className="text-[10px] text-surface-400">en cours</div>
            </div>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center justify-center text-center py-14 px-8">
          <AlertTriangle className="h-6 w-6 text-surface-400 mb-3" />
          <p className="text-sm text-surface-500">Aucun incident signalé</p>
          <p className="text-xs text-surface-400 mt-1">Tout incident pendant une formation de votre réseau apparaîtra ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((i) => {
            const grav = GRAVITE_META[i.gravite] || GRAVITE_META.mineur
            const stat = STATUT_META[i.statut] || STATUT_META.ouvert
            return (
              <div key={i.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center ${grav.bg}`}>
                    <AlertTriangle className={`h-5 w-5 ${grav.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-surface-900">{i.titre}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${grav.bg} ${grav.text}`}>{grav.label}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${stat.bg} ${stat.text}`}>{stat.label}</span>
                    </div>
                    <div className="text-xs text-surface-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{new Date(i.date_incident).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span>· {INCIDENT_TYPES[i.type] || i.type}</span>
                      {(i.client as any)?.raison_sociale && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{(i.client as any).raison_sociale}</span>}
                    </div>
                  </div>
                </div>
                {(i.description || i.mesures_prises) && (
                  <div className="mt-3 pt-3 border-t border-surface-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {i.description && (
                      <div><div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-1">Description</div><p className="text-surface-700 whitespace-pre-wrap">{i.description}</p></div>
                    )}
                    {i.mesures_prises && (
                      <div><div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">Mesures prises</div><p className="text-surface-700 whitespace-pre-wrap">{i.mesures_prises}</p></div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
