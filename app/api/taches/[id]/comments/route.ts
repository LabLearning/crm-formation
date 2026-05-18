import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  // Vérifier que la tâche appartient à l'org
  const { data: tache } = await supabase
    .from('crm_taches')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', session.organization.id)
    .single()

  if (!tache) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: comments } = await supabase
    .from('crm_taches_commentaires')
    .select('id, contenu, created_at, author:users!crm_taches_commentaires_author_id_fkey(id, first_name, last_name, email)')
    .eq('tache_id', params.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ comments: comments || [] })
}
