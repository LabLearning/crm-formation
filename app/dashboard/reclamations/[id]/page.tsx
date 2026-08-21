import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ReclamationDetail } from './ReclamationDetail'

export const dynamic = 'force-dynamic'

/**
 * Fiche de traitement d'une réclamation (ind. 31) : les informations, puis la
 * trace écrite et datée de chaque étape — réception, analyse, action
 * corrective, clôture avec la réponse à l'émetteur.
 */
export default async function ReclamationPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: rec } = await supabase.from('reclamations')
    .select(`*,
      apprenant:apprenant_id(prenom, nom),
      client:client_id(raison_sociale, nom_commercial),
      session:session_id(reference, intitule, date_debut),
      responsable:responsable_id(first_name, last_name)`)
    .eq('id', params.id)
    .eq('organization_id', session.organization.id)
    .maybeSingle()
  if (!rec) notFound()

  return <ReclamationDetail rec={rec as any} />
}
