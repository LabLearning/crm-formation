'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'
import { COMPETENCES_FORMATEUR } from '@/lib/evaluation-formateur'

const ROLES = ['super_admin', 'gestionnaire', 'directeur_commercial']

/**
 * Enregistre la fiche d'évaluation d'un formateur (indicateur 21).
 *
 * Une seule fiche courante par formateur — l'upsert la tient à jour. La note
 * globale est la moyenne des compétences notées : une synthèse qui divergerait
 * du détail se ferait démonter en deux questions.
 */
export async function enregistrerEvaluationFormateurAction(
  formateurId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { data: formateur } = await supabase.from('formateurs')
    .select('id').eq('id', formateurId).eq('organization_id', session.organization.id).maybeSingle()
  if (!formateur) return { success: false, error: 'Formateur introuvable' }

  const notes: Record<string, number> = {}
  for (const c of COMPETENCES_FORMATEUR) {
    const v = Number(formData.get(`note_${c.cle}`))
    if (v >= 1 && v <= 5) notes[c.cle] = v
  }
  const valeurs = Object.values(notes)
  const noteGlobale = valeurs.length
    ? Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 10) / 10
    : null

  const { error } = await supabase.from('formateur_evaluations').upsert({
    organization_id: session.organization.id,
    formateur_id: formateurId,
    notes,
    qualite_documentation: String(formData.get('qualite_documentation') || '').trim() || null,
    qualite_echanges: String(formData.get('qualite_echanges') || '').trim() || null,
    disponibilites: String(formData.get('disponibilites') || '').trim() || null,
    competences_techniques: String(formData.get('competences_techniques') || '').trim() || null,
    synthese: String(formData.get('synthese') || '').trim() || null,
    note_globale: noteGlobale,
    date_evaluation: String(formData.get('date_evaluation') || '') || new Date().toISOString().slice(0, 10),
    evaluateur_id: session.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'formateur_id' })

  if (error) {
    console.error('[évaluation formateur]', error)
    return { success: false, error: 'Enregistrement impossible (migration 133 appliquée ?)' }
  }

  await logAudit({ action: 'update', entity_type: 'formateur', entity_id: formateurId, details: { evaluation: true, note_globale: noteGlobale } })
  revalidatePath(`/dashboard/formateurs/${formateurId}`)
  return { success: true }
}
