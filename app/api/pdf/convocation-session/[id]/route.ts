import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { ConvocationSessionPDF } from '@/lib/pdf/convocation-session-pdf'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error
  const supabase = await createServiceRoleClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('*, formateur:formateurs(prenom, nom), client:client_id(raison_sociale, nom_commercial, sigle)')
    .eq('id', params.id).eq('organization_id', auth.user.organizationId).single()
  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })

  const [{ data: formation }, { data: orgRaw }, { data: inscriptions }, { data: refContact }] = await Promise.all([
    session.formation_id ? supabase.from('formations').select('*').eq('id', session.formation_id).single() : Promise.resolve({ data: null }),
    supabase.from('organizations').select('*').eq('id', auth.user.organizationId).single(),
    supabase.from('inscriptions').select('apprenant:apprenants(civilite, prenom, nom)').eq('session_id', params.id).not('status', 'in', '("annule","abandonne")'),
    session.client_id ? supabase.from('contacts').select('prenom, nom').eq('client_id', session.client_id).order('est_principal', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)
  const participants = (inscriptions || []).map((i: any) => i.apprenant).filter(Boolean)
  const entreprise = (session as any).client?.raison_sociale || null
  const referentNom = refContact ? [refContact.prenom, refContact.nom].filter(Boolean).join(' ') : null

  const buffer = await renderToBuffer(
    createElement(ConvocationSessionPDF, { session, formation, org, formateur: (session as any).formateur, participants, entreprise, referentNom }) as any
  )
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="convocation-${session.reference || session.id}.pdf"`,
      'Cache-Control': 'private, max-age=0',
    },
  })
}
