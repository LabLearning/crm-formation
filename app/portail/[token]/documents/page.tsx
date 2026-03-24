import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, Download } from 'lucide-react'
import { Badge } from '@/components/ui'
import { DOCUMENT_TYPE_LABELS, SIGNATURE_STATUS_LABELS, SIGNATURE_STATUS_COLORS } from '@/lib/types/document'
import { formatDate } from '@/lib/utils'
import type { SignatureStatus } from '@/lib/types/document'

export default async function PortalDocumentsPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context) redirect('/portail/expired')

  const supabase = await createServiceRoleClient()
  const field = context.type === 'apprenant' ? 'apprenant_id' : 'formateur_id' as string
  const targetId = context.type === 'apprenant' ? context.apprenant.id : context.formateur.id

  // Documents assigned to this person
  const { data: documents } = await supabase
    .from('documents')
    .select('*, signatures(*)')
    .eq(context.type === 'apprenant' ? 'apprenant_id' : 'organization_id',
        context.type === 'apprenant' ? targetId : context.organization.id)
    .order('created_at', { ascending: false })

  const allDocs = documents || []

  // Also get pending signatures
  const email = context.type === 'apprenant' ? context.apprenant.email : context.formateur.email
  let pendingSignatures: { id: string; signataire_nom: string; status: string; token: string; document: { nom: string; type: string } }[] = []
  if (email) {
    const { data: sigs } = await supabase
      .from('signatures')
      .select('id, signataire_nom, status, token, document:documents(nom, type)')
      .eq('signataire_email', email)
      .eq('status', 'en_attente')
    pendingSignatures = (sigs || []) as any
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Mes documents</h1>
        <p className="text-surface-500 mt-1">Documents et attestations</p>
      </div>

      {/* Pending signatures */}
      {pendingSignatures.length > 0 && (
        <div className="card p-6 border-warning-200 border">
          <h2 className="text-base font-heading font-semibold text-warning-700 mb-3">Documents à signer</h2>
          <div className="space-y-2">
            {pendingSignatures.map((sig) => (
              <div key={sig.id} className="flex items-center justify-between p-3 rounded-xl bg-warning-50">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-warning-600" />
                  <div>
                    <div className="text-sm font-medium text-surface-800">{sig.document?.nom || 'Document'}</div>
                    <div className="text-xs text-surface-500">{DOCUMENT_TYPE_LABELS[(sig.document?.type as any) || 'autre']}</div>
                  </div>
                </div>
                <Badge variant="warning">En attente de signature</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents list */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Document</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {allDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-surface-400 shrink-0" />
                      <span className="text-sm font-medium text-surface-900">{doc.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5"><Badge variant="default">{DOCUMENT_TYPE_LABELS[(doc.type as any) || 'autre']}</Badge></td>
                  <td className="px-6 py-3.5 hidden md:table-cell text-sm text-surface-500">{formatDate(doc.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {allDocs.length === 0 && <div className="text-center py-12 text-sm text-surface-500">Aucun document disponible</div>}
      </div>
    </div>
  )
}
