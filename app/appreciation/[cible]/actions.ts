'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

/**
 * Dépôt public d'une appréciation (indicateur 30) — entreprise cliente après
 * une session, ou financeur dans le cadre de la sollicitation annuelle.
 *
 * Le lien porte l'identifiant de la session (entreprise) ou de l'organisation
 * (financeur) : des UUID non devinables qui servent de capacité d'accès, sans
 * compte. Le honeypot écarte les robots.
 */
export async function deposerAppreciationAction(
  cible: string,
  formData: FormData,
): Promise<ActionResult> {
  if (String(formData.get('site_web') || '').trim() !== '') return { success: true }

  const supabase = await createServiceRoleClient()
  const note = (champ: string) => {
    const v = Number(formData.get(champ))
    return v >= 1 && v <= 5 ? v : null
  }

  // La cible est soit une session (appréciation entreprise), soit
  // l'organisation elle-même (appréciation financeur).
  const { data: session } = await supabase.from('sessions')
    .select('id, organization_id, client_id').eq('id', cible).maybeSingle()
  let organizationId: string | null = null
  let type = 'entreprise'
  let sessionId: string | null = null
  let clientId: string | null = null

  if (session) {
    organizationId = (session as any).organization_id
    sessionId = (session as any).id
    clientId = (session as any).client_id
  } else {
    const { data: org } = await supabase.from('organizations').select('id').eq('id', cible).maybeSingle()
    if (!org) return { success: false, error: 'Lien invalide' }
    organizationId = (org as any).id
    type = formData.get('role') === 'formateur' ? 'formateur' : 'financeur'
  }

  if (!note('note_globale')) return { success: false, error: 'Merci d’indiquer au moins la note globale.' }

  const { error } = await supabase.from('appreciations_parties_prenantes').insert({
    organization_id: organizationId,
    type,
    session_id: sessionId,
    client_id: clientId,
    note_globale: note('note_globale'),
    note_organisation: note('note_organisation'),
    note_intervenant: note('note_intervenant'),
    recommande: formData.get('recommande') === 'oui' ? true : formData.get('recommande') === 'non' ? false : null,
    commentaire: String(formData.get('commentaire') || '').trim().slice(0, 3000) || null,
    repondant_nom: String(formData.get('nom') || '').trim().slice(0, 120) || null,
    repondant_fonction: String(formData.get('fonction') || '').trim().slice(0, 120) || null,
    repondant_email: String(formData.get('email') || '').trim().slice(0, 200) || null,
  })
  if (error) {
    console.error('[appréciation publique]', error)
    return { success: false, error: 'Une erreur est survenue — vous pouvez nous écrire à digital@lab-learning.fr.' }
  }
  return { success: true }
}
