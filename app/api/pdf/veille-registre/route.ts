import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { VeilleRegistrePDF } from '@/lib/pdf/veille-registre-pdf'

export const dynamic = 'force-dynamic'

/**
 * Registre de veille en PDF (critère 6) : les entrées validées, chacune avec
 * sa date, sa source et l'action concrète datée. Édité à la demande — le
 * registre ne peut pas présenter un état périmé à l'auditeur.
 */
export async function GET() {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error

  const supabase = await createServiceRoleClient()
  const orgId = auth.user.organizationId

  const [{ data: entrees }, { data: org }] = await Promise.all([
    supabase.from('veilles')
      .select('type, titre, date_veille, source, resume, action')
      .eq('organization_id', orgId)
      .order('date_veille', { ascending: false }),
    supabase.from('organizations').select('*').eq('id', orgId).single(),
  ])

  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const orgLogo = await withDocumentLogo(supabase, org)

  const buffer = await renderToBuffer(
    createElement(VeilleRegistrePDF, {
      org: orgLogo,
      entrees: entrees || [],
      dateEdition: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    }) as any,
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="registre-de-veille.pdf"',
      'Cache-Control': 'private, max-age=0',
    },
  })
}
