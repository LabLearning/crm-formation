import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { FinanceursClient } from './FinanceursClient'

export const dynamic = 'force-dynamic'

/**
 * Sollicitation annuelle des financeurs (ind. 30) : envoi du questionnaire
 * d'appréciation à AKTO, France Travail, OPCO EP et Opcommerce, avec
 * l'historique des envois et les réponses reçues.
 */
export default async function FinanceursPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const [{ data: reponses }, { data: envois }] = await Promise.all([
    supabase.from('appreciations_parties_prenantes')
      .select('id, note_globale, note_organisation, note_intervenant, recommande, commentaire, repondant_nom, repondant_fonction, created_at')
      .eq('organization_id', session.organization.id).eq('type', 'financeur')
      .order('created_at', { ascending: false }),
    supabase.from('email_logs')
      .select('to_email, subject, status, sent_at, created_at')
      .eq('organization_id', session.organization.id)
      .ilike('subject', 'Votre appréciation%organisme de formation)%')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <FinanceursClient
      reponses={(reponses || []) as any[]}
      envois={(envois || []) as any[]}
      lienPublic={`${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'}/appreciation/${session.organization.id}`}
    />
  )
}
