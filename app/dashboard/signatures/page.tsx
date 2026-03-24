import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui'
import { SIGNATURE_STATUS_LABELS, SIGNATURE_STATUS_COLORS } from '@/lib/types/document'
import { formatDate } from '@/lib/utils'
import type { Signature } from '@/lib/types/document'

export default async function SignaturesPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: signatures } = await supabase
    .from('signatures')
    .select('*, document:documents(nom, type)')
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  const allSigs = (signatures || []) as (Signature & { document: { nom: string; type: string } })[]
  const pending = allSigs.filter((s) => s.status === 'en_attente').length

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Suivi des signatures</h1>
        <p className="text-surface-500 mt-1 text-sm">{allSigs.length} signature{allSigs.length > 1 ? 's' : ''} · {pending} en attente</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Document</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Signataire</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Rôle</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Statut</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Date</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Relances</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {allSigs.map((sig) => (
                <tr key={sig.id} className="hover:bg-surface-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-surface-900">{sig.document?.nom || '—'}</td>
                  <td className="px-6 py-3.5">
                    <div className="text-sm text-surface-800">{sig.signataire_nom}</div>
                    <div className="text-xs text-surface-500">{sig.signataire_email}</div>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-surface-600 capitalize">{sig.signataire_role || '—'}</td>
                  <td className="px-6 py-3.5">
                    <Badge variant={SIGNATURE_STATUS_COLORS[sig.status]} dot>{SIGNATURE_STATUS_LABELS[sig.status]}</Badge>
                  </td>
                  <td className="px-6 py-3.5 hidden md:table-cell text-sm text-surface-500">
                    {sig.signed_at ? formatDate(sig.signed_at, { day: 'numeric', month: 'short' }) : formatDate(sig.created_at, { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-6 py-3.5 hidden lg:table-cell text-sm text-surface-500">{sig.relance_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {allSigs.length === 0 && (
          <div className="text-center py-12 text-sm text-surface-500">Aucune signature en cours</div>
        )}
      </div>
    </div>
  )
}
