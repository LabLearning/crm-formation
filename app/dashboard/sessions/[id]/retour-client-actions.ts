'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

/**
 * Retour client recueilli par téléphone après la formation : ce que le client
 * a dit, tel quel. Enregistré comme appréciation d'entreprise (ind. 30) —
 * même registre que le formulaire en ligne, canal téléphone.
 */
export async function enregistrerRetourClientAction(sessionId: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (['formateur', 'apprenant'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { data: sess } = await supabase.from('sessions')
    .select('id, client_id').eq('id', sessionId).eq('organization_id', session.organization.id).maybeSingle()
  if (!sess) return { success: false, error: 'Session introuvable' }

  const verbatim = String(formData.get('verbatim') || '').trim()
  if (!verbatim) return { success: false, error: 'Notez ce que le client a dit — même en deux phrases.' }
  const note = Number(formData.get('note'))

  const { error } = await supabase.from('appreciations_parties_prenantes').insert({
    organization_id: session.organization.id,
    type: 'entreprise',
    session_id: sessionId,
    client_id: (sess as any).client_id || null,
    note_globale: note >= 1 && note <= 5 ? note : null,
    commentaire: verbatim,
    repondant_nom: String(formData.get('interlocuteur') || '').trim().slice(0, 120) || null,
    repondant_fonction: `${String(formData.get('fonction') || '').trim().slice(0, 80) || 'Contact client'} — recueilli par téléphone`,
  })
  if (error) { console.error('[retour client]', error.message); return { success: false, error: 'Enregistrement impossible (migration 134 appliquée ?)' } }

  await logAudit({ action: 'retour_client', entity_type: 'session', entity_id: sessionId, details: { note: note || null } })
  revalidatePath(`/dashboard/sessions/${sessionId}`)
  return { success: true }
}
