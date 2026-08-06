import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { AuditClient } from './AuditClient'

export const dynamic = 'force-dynamic'

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { lead?: string; audit?: string }
}) {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const leadId = searchParams?.lead || null

  const [auditsRes, leadRes] = await Promise.all([
    supabase
      .from('audits_conformite')
      .select('*')
      .eq('organization_id', session.organization.id)
      .order('created_at', { ascending: false })
      .limit(200),
    leadId
      ? supabase
          .from('leads')
          .select('id, entreprise, convention_collective, nombre_stagiaires, contact_nom, contact_prenom, contact_email, contact_telephone')
          .eq('id', leadId)
          .eq('organization_id', session.organization.id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ])

  // Table absente (migration 113 non appliquée) : l'outil reste utilisable sans historique.
  const tableManquante = !!auditsRes.error
  if (auditsRes.error) console.error('[audits_conformite]', auditsRes.error.message)

  const lead = leadRes?.data || null
  const prefill = lead
    ? {
        lead_id: lead.id,
        etabNom: lead.entreprise || '',
        convention: lead.convention_collective || '',
        effectif: lead.nombre_stagiaires ? String(lead.nombre_stagiaires) : '',
        contactNom: [lead.contact_prenom, lead.contact_nom].filter(Boolean).join(' '),
        contactEmail: lead.contact_email || '',
        contactTel: lead.contact_telephone || '',
      }
    : null

  const commercial = [session.user.first_name, session.user.last_name].filter(Boolean).join(' ')

  return (
    <AuditClient
      audits={(auditsRes.data as any[]) || []}
      prefill={prefill}
      commercialDefaut={commercial || session.user.email || ''}
      tableManquante={tableManquante}
      auditIdOuvert={searchParams?.audit || null}
    />
  )
}
