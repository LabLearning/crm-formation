import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { PlanAmeliorationPDF } from '@/lib/pdf/plan-amelioration-pdf'

export const dynamic = 'force-dynamic'

/**
 * Plan d'amélioration continue en PDF (indicateur 32) : tableau de suivi des
 * mesures, édité à la demande depuis le registre vivant du CRM.
 */
export async function GET() {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error

  const supabase = await createServiceRoleClient()
  const orgId = auth.user.organizationId

  const [{ data: actions }, { data: org }] = await Promise.all([
    supabase.from('actions_amelioration')
      .select('titre, description, source, status, date_planifiee, date_echeance, date_realisation, resultat')
      .eq('organization_id', orgId)
      .order('date_realisation', { ascending: false, nullsFirst: false }),
    supabase.from('organizations').select('*').eq('id', orgId).single(),
  ])

  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const orgLogo = await withDocumentLogo(supabase, org)

  const buffer = await renderToBuffer(
    createElement(PlanAmeliorationPDF, {
      org: orgLogo,
      actions: actions || [],
      dateEdition: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    }) as any,
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="plan-amelioration-continue.pdf"',
      'Cache-Control': 'private, max-age=0',
    },
  })
}
