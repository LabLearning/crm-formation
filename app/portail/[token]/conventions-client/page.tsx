import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileSignature, Download, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui'
import { formatDate } from '@/lib/utils'

export default async function ClientConventionsPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'client') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()

  const { data: conventions } = await supabase
    .from('conventions')
    .select(`
      id, reference, type, status, montant_ht, date_creation, date_signature,
      formation:formations(intitule, duree_heures),
      session:sessions(date_debut, date_fin, lieu)
    `)
    .eq('client_id', context.client.id)
    .order('date_creation', { ascending: false })

  const statusConfig: Record<string, { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'danger'; icon: React.ReactNode }> = {
    brouillon: { label: 'Brouillon', variant: 'default', icon: <Clock className="h-3.5 w-3.5" /> },
    envoyee: { label: 'Envoyee', variant: 'info', icon: <Clock className="h-3.5 w-3.5" /> },
    signee: { label: 'Signee', variant: 'success', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    annulee: { label: 'Annulee', variant: 'danger', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  }

  const enAttente = (conventions || []).filter((c: any) => c.status === 'envoyee')
  const signees = (conventions || []).filter((c: any) => c.status === 'signee')

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-heading font-bold text-surface-900 tracking-heading mb-1">Conventions</h1>
      <p className="text-surface-500 text-sm mb-6">Vos conventions de formation</p>

      {/* En attente */}
      {enAttente.length > 0 && (
        <div className="mb-6">
          <div className="card p-4 border-warning-200 border bg-warning-50/30 mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-warning-800">
              <AlertTriangle className="h-4 w-4" />
              {enAttente.length} convention(s) en attente de signature
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(conventions || []).map((conv: any) => {
          const sc = statusConfig[conv.status] || statusConfig.brouillon
          return (
            <div key={conv.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSignature className="h-4 w-4 text-surface-400" />
                    <span className="text-base font-heading font-semibold text-surface-900">
                      {conv.formation?.intitule || conv.reference}
                    </span>
                  </div>
                  <div className="text-sm text-surface-500 space-y-0.5 mt-2">
                    <div>Reference : {conv.reference}</div>
                    <div>Type : {conv.type === 'inter' ? 'Inter-entreprise' : 'Intra-entreprise'}</div>
                    {conv.session?.date_debut && <div>Dates : {formatDate(conv.session.date_debut, { day: 'numeric', month: 'long', year: 'numeric' })}{conv.session.date_fin && conv.session.date_fin !== conv.session.date_debut ? ' - ' + formatDate(conv.session.date_fin, { day: 'numeric', month: 'long' }) : ''}</div>}
                    {conv.session?.lieu && <div>Lieu : {conv.session.lieu}</div>}
                    {conv.montant_ht && <div>Montant HT : {Number(conv.montant_ht).toLocaleString('fr-FR')} EUR</div>}
                    {conv.date_creation && <div>Date : {formatDate(conv.date_creation, { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
                    {conv.date_signature && <div>Signee le : {formatDate(conv.date_signature, { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
                  </div>
                </div>
                <Badge variant={sc.variant}>{sc.label}</Badge>
              </div>
            </div>
          )
        })}
      </div>

      {(!conventions || conventions.length === 0) && (
        <div className="card flex flex-col items-center justify-center text-center py-16">
          <FileSignature className="h-8 w-8 text-surface-300 mb-3" />
          <p className="text-sm text-surface-500">Aucune convention pour le moment</p>
        </div>
      )}
    </div>
  )
}
