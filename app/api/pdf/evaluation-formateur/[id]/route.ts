import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { withDocumentLogo } from '@/lib/pdf/org-logo'
import { EvaluationFormateurPDF } from '@/lib/pdf/evaluation-formateur-pdf'

export const dynamic = 'force-dynamic'

/** Fiche d'évaluation du profil et des compétences d'un formateur (ind. 21). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error
  const orgId = auth.user.organizationId
  const supabase = await createServiceRoleClient()

  const [{ data: formateur }, { data: evaluation }, { data: orgRow }, { count: nbSessions }] = await Promise.all([
    supabase.from('formateurs').select('*').eq('id', params.id).eq('organization_id', orgId).maybeSingle(),
    supabase.from('formateur_evaluations').select('*').eq('formateur_id', params.id).maybeSingle(),
    supabase.from('organizations').select('*').eq('id', orgId).maybeSingle(),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('formateur_id', params.id).eq('status', 'terminee'),
  ])
  if (!formateur) return NextResponse.json({ error: 'Formateur introuvable' }, { status: 404 })

  const org = await withDocumentLogo(supabase, orgRow)
  const buffer = await renderToBuffer(
    createElement(EvaluationFormateurPDF, { formateur, evaluation, org, nbSessions: nbSessions || 0 }) as any,
  )

  const nom = `evaluation-${(formateur as any).nom || 'formateur'}-${(formateur as any).prenom || ''}`.replace(/\s+/g, '_')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nom}.pdf"`,
    },
  })
}
