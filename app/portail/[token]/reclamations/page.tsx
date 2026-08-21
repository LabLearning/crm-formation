import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ToastProvider } from '@/components/ui'
import { ReclamationsApprenantClient } from './ReclamationsApprenantClient'

export const dynamic = 'force-dynamic'

/**
 * Réclamations de l'apprenant : dépôt depuis son espace + suivi du
 * traitement (reçue, en analyse, action corrective, clôturée) — le circuit
 * des indicateurs 31/32, visible côté stagiaire.
 */
export default async function PortalReclamationsPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'apprenant') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()
  const { data: reclamations } = await supabase
    .from('reclamations')
    .select('id, numero, objet, description, status, date_reception, date_cloture, commentaire_cloture')
    .eq('apprenant_id', context.apprenant.id)
    .order('date_reception', { ascending: false })

  return (
    <ToastProvider>
      <ReclamationsApprenantClient token={params.token} reclamations={(reclamations || []) as any[]} />
    </ToastProvider>
  )
}
