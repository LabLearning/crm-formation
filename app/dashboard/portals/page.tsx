import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PortalManagement } from './PortalManagement'

export default async function PortalsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: tokens } = await supabase
    .from('portal_access_tokens')
    .select(`
      *,
      apprenant:apprenants(prenom, nom, email),
      formateur:formateurs(prenom, nom, email)
    `)
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  const { data: apprenants } = await supabase
    .from('apprenants')
    .select('id, prenom, nom, email')
    .eq('organization_id', session.organization.id)
    .order('nom')

  const { data: formateurs } = await supabase
    .from('formateurs')
    .select('id, prenom, nom, email')
    .eq('organization_id', session.organization.id)
    .eq('is_active', true)
    .order('nom')

  return (
    <div className="animate-fade-in">
      <PortalManagement
        tokens={tokens || []}
        apprenants={apprenants || []}
        formateurs={formateurs || []}
        appUrl={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
      />
    </div>
  )
}
