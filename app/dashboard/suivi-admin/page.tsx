import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { SuiviAdminClient } from './SuiviAdminClient'

export default async function SuiviAdminPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  // Fetch formateurs for assignment
  const { data: formateurs } = await supabase
    .from('formateurs')
    .select('id, nom, prenom, telephone, email, specialites')
    .eq('organization_id', orgId)
    .eq('is_active', true)

  return (
    <div className="animate-fade-in">
      <SuiviAdminClient
        formateurs={(formateurs || []).map((f: any) => ({
          id: f.id,
          nom: `${f.nom || ''} ${f.prenom || ''}`.trim(),
          tel: f.telephone || '',
          email: f.email || '',
          specialites: f.specialites || [],
        }))}
      />
    </div>
  )
}
