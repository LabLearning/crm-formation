import { getFranchiseSession } from '@/lib/franchise-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Building2, MapPin, GraduationCap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FranchiseEtablissementsPage() {
  const { franchise, organization } = await getFranchiseSession()
  const supabase = await createServiceRoleClient()
  const orgId = organization.id

  const { data: etablissements } = await supabase
    .from('clients')
    .select('id, raison_sociale, ville, code_postal, secteur_activite')
    .eq('franchise_id', franchise.id)
    .eq('organization_id', orgId)
    .order('raison_sociale')

  const clientIds = (etablissements || []).map((c) => c.id)

  // Compter les dossiers/sessions par établissement
  const { data: dossiers } = clientIds.length
    ? await supabase
        .from('dossiers_formation')
        .select('id, client_id, status')
        .eq('organization_id', orgId)
        .in('client_id', clientIds)
    : { data: [] as any[] }

  const countFor = (cid: string) => {
    const ds = (dossiers || []).filter((d) => d.client_id === cid)
    return { total: ds.length, realises: ds.filter((d) => d.status === 'realise' || d.status === 'cloture' || d.status === 'facture').length }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Mes établissements</h1>
        <p className="text-surface-500 text-sm mt-1">
          {(etablissements || []).length} établissement{(etablissements || []).length > 1 ? 's' : ''} de votre réseau.
        </p>
      </div>

      {(etablissements || []).length === 0 ? (
        <div className="card flex flex-col items-center justify-center text-center py-14 px-8">
          <Building2 className="h-6 w-6 text-surface-400 mb-3" />
          <p className="text-sm text-surface-500">Aucun établissement rattaché pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(etablissements || []).map((c) => {
            const cnt = countFor(c.id)
            return (
              <div key={c.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-semibold text-surface-900 truncate">{c.raison_sociale}</h3>
                    {(c.code_postal || c.ville) && (
                      <div className="text-xs text-surface-500 mt-0.5 inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {[c.code_postal, c.ville].filter(Boolean).join(' ')}
                      </div>
                    )}
                    {c.secteur_activite && <div className="text-xs text-surface-400 mt-0.5">{c.secteur_activite}</div>}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-surface-100 flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-surface-600">
                    <GraduationCap className="h-3.5 w-3.5 text-surface-400" />
                    <strong className="text-surface-900">{cnt.realises}</strong> formation{cnt.realises > 1 ? 's' : ''} réalisée{cnt.realises > 1 ? 's' : ''}
                  </span>
                  {cnt.total > cnt.realises && (
                    <span className="text-surface-400">{cnt.total - cnt.realises} en cours</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
