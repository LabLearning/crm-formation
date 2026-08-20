import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ReglementInterieurPDF } from '@/lib/pdf/reglement-interieur-pdf'

export const dynamic = 'force-dynamic'

const ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || 'ff747dfe-c034-44d8-98d7-e53892263fb5'

/**
 * Règlement intérieur en PDF — route PUBLIQUE : le document est déjà publié
 * intégralement sur le site (indicateur 9, remise avant l'entrée en
 * formation) ; le PDF est la même source, mise en page pour l'impression.
 */
export async function GET() {
  const supabase = await createServiceRoleClient()
  const { data: org } = await supabase.from('organizations').select('*').eq('id', ORG_ID).single()

  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const orgLogo = await withDocumentLogo(supabase, org)

  const buffer = await renderToBuffer(
    createElement(ReglementInterieurPDF, {
      org: orgLogo,
      dateEdition: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    }) as any,
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="reglement-interieur-lab-learning.pdf"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
