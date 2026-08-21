'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPortalContext } from '@/lib/portal-auth'

/**
 * Réclamation déposée par l'apprenant depuis son espace : même registre que
 * le formulaire public et le traitement interne (indicateurs 31/32), avec le
 * stagiaire déjà identifié — pas de ressaisie, pas de perte.
 */
export async function deposerReclamationAction(
  token: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const context = await getPortalContext(token)
  if (!context || context.type !== 'apprenant') return { success: false, error: 'Accès non autorisé' }

  const objet = String(formData.get('objet') || '').trim()
  const description = String(formData.get('description') || '').trim()
  if (!objet) return { success: false, error: 'Indiquez l\'objet de votre réclamation' }
  if (!description) return { success: false, error: 'Décrivez ce qui s\'est passé' }

  const supabase = await createServiceRoleClient()
  const a: any = context.apprenant
  const { error } = await supabase.from('reclamations').insert({
    organization_id: (context as any).organization?.id || a.organization_id,
    numero: '',
    objet: objet.slice(0, 200),
    description: description.slice(0, 5000),
    origine: 'apprenant',
    priorite: 'moyenne',
    apprenant_id: a.id,
    emetteur_nom: `${a.prenom || ''} ${a.nom || ''}`.trim(),
    emetteur_email: a.email || null,
  })
  if (error) {
    console.error('[reclamation portail]', error.message)
    return { success: false, error: 'Envoi impossible, réessayez' }
  }

  revalidatePath(`/portail/${token}/reclamations`)
  return { success: true }
}
