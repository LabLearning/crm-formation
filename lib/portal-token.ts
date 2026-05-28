import { randomBytes, createHash } from 'crypto'

/**
 * Récupère le token de portail actif d'un apprenant, ou en crée un (valable 2 ans).
 * Sert notamment aux liens WhatsApp (bouton → /portail/{token}).
 */
export async function getOrCreateApprenantToken(
  supabase: any,
  apprenantId: string,
  organizationId: string,
  email?: string | null,
): Promise<string | null> {
  if (!apprenantId) return null
  const { data: existing } = await supabase
    .from('portal_access_tokens')
    .select('token')
    .eq('type', 'apprenant')
    .eq('apprenant_id', apprenantId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .maybeSingle()
  if (existing?.token) return existing.token

  const token = createHash('sha256').update(randomBytes(32)).digest('hex')
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 2)
  const { error } = await supabase.from('portal_access_tokens').insert({
    organization_id: organizationId,
    type: 'apprenant',
    apprenant_id: apprenantId,
    email: email || null,
    token,
    is_active: true,
    expires_at: expiresAt.toISOString(),
  })
  if (error) { console.error('[portal-token]', error); return null }
  return token
}
