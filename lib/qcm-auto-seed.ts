/**
 * Auto-création des qcm_reponses pour les apprenants d'une session
 * en fonction du moment du cycle :
 *   - confirmation session → 'positionnement' + 'entree'
 *   - fin de session (terminee) → 'sortie' + 'satisfaction_chaud'
 *   - J+90 après fin session → 'satisfaction_froid' (via cron)
 *
 * Requiert que des QCM de chaque type existent pour la formation
 * (créés dans /dashboard/qcm).
 */

export type QcmType = 'positionnement' | 'entree' | 'sortie' | 'satisfaction_chaud' | 'satisfaction_froid'

export async function seedQcmReponsesForSession(
  supabase: any,
  sessionId: string,
  qcmType: QcmType,
) {
  // 1. Trouver la session + ses inscriptions actives
  const { data: sess } = await supabase
    .from('sessions')
    .select('id, organization_id, formation_id')
    .eq('id', sessionId)
    .single()
  if (!sess?.formation_id) return { created: 0 }

  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('apprenant_id')
    .eq('session_id', sessionId)
    .not('status', 'in', '("annule","abandonne")')

  const apprenantIds = (inscriptions || []).map((i: any) => i.apprenant_id).filter(Boolean)
  if (apprenantIds.length === 0) return { created: 0 }

  // 2. Trouver les QCM du type demandé liés à la formation
  const { data: qcms } = await supabase
    .from('qcm')
    .select('id')
    .eq('organization_id', sess.organization_id)
    .eq('formation_id', sess.formation_id)
    .eq('type', qcmType)
    .eq('is_active', true)

  if (!qcms || qcms.length === 0) return { created: 0 }  // Pas de QCM configuré pour ce type

  // 3. Pour chaque QCM × apprenant, créer une qcm_reponses si elle n'existe pas
  let created = 0
  for (const qcm of qcms) {
    // Vérifier les réponses déjà existantes pour ce QCM × ces apprenants
    const { data: existing } = await supabase
      .from('qcm_reponses')
      .select('apprenant_id')
      .eq('qcm_id', qcm.id)
      .in('apprenant_id', apprenantIds)

    const existingSet = new Set((existing || []).map((e: any) => e.apprenant_id))
    const toCreate = apprenantIds.filter((aid: string) => !existingSet.has(aid))
    if (toCreate.length === 0) continue

    const rows = toCreate.map((aid: string) => ({
      organization_id: sess.organization_id,
      qcm_id: qcm.id,
      apprenant_id: aid,
      session_id: sessionId,
      is_complete: false,
    }))
    const { error } = await supabase.from('qcm_reponses').insert(rows)
    if (!error) created += rows.length
  }

  return { created }
}

/** Notifie les apprenants concernés qu'un QCM leur est disponible */
export async function notifyApprenantsForQcm(
  supabase: any,
  sessionId: string,
  qcmType: QcmType,
) {
  const { createNotification } = await import('@/lib/email')
  const labels: Record<QcmType, string> = {
    positionnement: 'Test de positionnement',
    entree: 'Évaluation d\'entrée',
    sortie: 'Évaluation de sortie',
    satisfaction_chaud: 'Questionnaire de satisfaction',
    satisfaction_froid: 'Questionnaire de satisfaction à froid (3 mois)',
  }

  const { data: sess } = await supabase
    .from('sessions')
    .select('organization_id, formation:formation_id(intitule)')
    .eq('id', sessionId).single()
  if (!sess) return

  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('apprenant:apprenants(id, user_id, prenom, email, whatsapp, whatsapp_opt_in)')
    .eq('session_id', sessionId)
    .not('status', 'in', '("annule","abandonne")')

  const formationName = (sess as any).formation?.intitule || 'Formation'

  // QCM type → template WhatsApp (les types sans template restent en notif seule)
  const waTemplate: Partial<Record<QcmType, string>> = {
    positionnement: 'questionnaire_positionnement',
    sortie: 'evaluation_sortie',
    satisfaction_chaud: 'satisfaction_chaud',
    satisfaction_froid: 'satisfaction_froid',
  }
  const { sendWhatsAppTemplate } = await import('@/lib/whatsapp')
  const { getOrCreateApprenantToken } = await import('@/lib/portal-token')

  for (const ins of inscriptions || []) {
    const a = (ins as any).apprenant
    if (a?.user_id) {
      await createNotification({
        organizationId: sess.organization_id,
        userId: a.user_id,
        titre: labels[qcmType],
        message: `Un nouveau questionnaire est disponible pour la formation "${formationName}".`,
        type: 'qcm',
        lienUrl: '/mon-espace',
        lienLabel: 'Compléter le questionnaire',
        entityType: 'session',
        entityId: sessionId,
      })
    }

    // WhatsApp si opt-in + numéro + template existant pour ce type
    const tpl = waTemplate[qcmType]
    if (tpl && a?.whatsapp_opt_in && a?.whatsapp && a?.id) {
      const token = await getOrCreateApprenantToken(supabase, a.id, sess.organization_id, a.email)
      if (token) {
        await sendWhatsAppTemplate({
          organizationId: sess.organization_id,
          to: a.whatsapp,
          toName: a.prenom || '',
          template: tpl,
          languageCode: 'fr',
          bodyParams: [a.prenom || 'Bonjour', formationName],
          buttonUrlParam: token,
          entityType: 'session',
          entityId: sessionId,
        })
      }
    }
  }
}
