import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { withDocumentLogo } from '@/lib/pdf/org-logo'
import { GrilleEntretienPDF } from '@/lib/pdf/grille-entretien-pdf'

export const dynamic = 'force-dynamic'

/** Grille d'entretien de recrutement formateur, vierge (indicateur 21). */
export async function GET() {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error
  const supabase = await createServiceRoleClient()
  const { data: orgRow } = await supabase.from('organizations').select('*').eq('id', auth.user.organizationId).maybeSingle()
  const org = await withDocumentLogo(supabase, orgRow)

  const buffer = await renderToBuffer(createElement(GrilleEntretienPDF, { org }) as any)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="grille-entretien-formateur.pdf"',
    },
  })
}
