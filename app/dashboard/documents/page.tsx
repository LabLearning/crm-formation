import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { DocumentsList } from './DocumentsList'
import type { Document } from '@/lib/types/document'

export default async function DocumentsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: documents } = await supabase
    .from('documents')
    .select('*, client:clients(raison_sociale), signatures(*)')
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in">
      <DocumentsList documents={(documents || []) as Document[]} />
    </div>
  )
}
