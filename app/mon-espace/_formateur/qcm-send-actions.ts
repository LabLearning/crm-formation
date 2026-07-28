'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { getPortalContext } from '@/lib/portal-auth'
import type { ActionResult } from '@/lib/types'

async function resolveFormateur(token: string | null) {
  const supabase = await createServiceRoleClient()
  if (token) {
    const ctx = await getPortalContext(token)
    if (ctx && ctx.type === 'formateur') return { supabase, formateurId: ctx.formateur.id as string, orgId: ctx.organization.id as string }
  }
  try {
    const session = await getSession()
    if (session.user.role !== 'formateur') return null
    const { data: f } = await supabase.from('formateurs').select('id').eq('user_id', session.user.id).single()
    if (!f) return null
    return { supabase, formateurId: f.id as string, orgId: session.organization.id as string }
  } catch { return null }
}

/**
 * Envoie un questionnaire aux apprenants inscrits d'une session : sème les
 * réponses (accès portail) puis notifie chacun (email brandé + WhatsApp si
 * opt-in + notification in-app), avec un lien vers son espace questionnaires.
 */
export async function sendQcmToApprenantsAction(sessionId: string, qcmId: string, token: string | null): Promise<ActionResult & { data?: { count: number } }> {
  const ctx = await resolveFormateur(token)
  if (!ctx) return { success: false, error: 'Accès non autorisé' }
  const { supabase, formateurId } = ctx

  // La session doit appartenir au formateur ; le QCM à son organisation
  const { data: sess } = await supabase.from('sessions').select('id').eq('id', sessionId).eq('formateur_id', formateurId).maybeSingle()
  if (!sess) return { success: false, error: 'Session introuvable' }
  const { data: qcm } = await supabase.from('qcm').select('id, type').eq('id', qcmId).eq('organization_id', ctx.orgId).maybeSingle()
  if (!qcm) return { success: false, error: 'Questionnaire introuvable' }

  const { seedQcmReponsesForQcm, notifyApprenantsForQcm } = await import('@/lib/qcm-auto-seed')
  // 1) S'assurer que chaque apprenant inscrit a bien sa réponse (accès portail)
  await seedQcmReponsesForQcm(supabase, sessionId, qcmId)
  // 2) Notifier (email + WhatsApp + notif) pour ce type de questionnaire
  await notifyApprenantsForQcm(supabase, sessionId, qcm.type as any)

  // Compter les destinataires (apprenants inscrits actifs)
  const { count } = await supabase
    .from('inscriptions').select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId).not('status', 'in', '("annule","abandonne")')

  return { success: true, data: { count: count || 0 } }
}
