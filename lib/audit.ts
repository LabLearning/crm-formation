import { createServerSupabaseClient } from '@/lib/supabase/server'

interface AuditLogEntry {
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, unknown>
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) return

    await supabase.from('audit_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      details: entry.details || null,
    })
  } catch (error) {
    console.error('[Audit Log Error]', error)
  }
}
