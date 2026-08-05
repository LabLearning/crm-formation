import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFormateurPortalToken } from '@/lib/formateur-portal'
import { redirect } from 'next/navigation'

/**
 * Résout le formateur À PARTIR DU COMPTE CONNECTÉ uniquement (jamais d'un id
 * d'URL). Le token de portail est résolu côté serveur : il appartient au
 * formateur connecté et sert aux server actions d'émargement / à l'API QR.
 */
export async function resolveFormateur() {
  const session = await getSession()
  if (session.user.role !== 'formateur') redirect('/mon-espace')

  const supabase = await createServiceRoleClient()
  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id, prenom, nom, email')
    .eq('user_id', session.user.id)
    .single()
  if (!formateur) redirect('/mon-espace')

  // Le token de portail n'est plus requis pour l'espace connecté : il reste
  // seulement transmis quand il existe (compat portail/QR émargement). Une
  // erreur de résolution ne doit JAMAIS casser l'accès du formateur connecté.
  let token = ''
  try {
    token = (await getFormateurPortalToken(
      supabase, session.organization.id, session.user.id, session.user.email,
    )) || ''
  } catch (e) {
    console.error('[resolveFormateur] token portail', e)
  }

  return {
    formateurId: formateur.id as string,
    formateurName: `${formateur.prenom} ${formateur.nom}`,
    formateurEmail: (formateur.email as string | null) ?? null,
    organizationId: session.organization.id as string,
    token,
  }
}
