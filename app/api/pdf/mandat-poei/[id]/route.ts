import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { MandatPoeiPDF } from '@/lib/pdf/mandat-poei-pdf'

export const dynamic = 'force-dynamic'

/**
 * Mandat POEI en PDF. `id` = projet POEI.
 *
 * Deux accès : l'utilisateur connecté du dashboard, ou le gérant via
 * `?token=` (celui de son lien de signature) — il doit pouvoir lire le
 * document avant de le signer.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServiceRoleClient()
  const token = req.nextUrl.searchParams.get('token')

  let orgId: string | null = null
  if (token) {
    const { data: mandat } = await supabase.from('poei_mandats')
      .select('organization_id, poei_id, token_expires_at').eq('token', token).maybeSingle()
    if (!mandat || mandat.poei_id !== params.id) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })
    if (mandat.token_expires_at && new Date(mandat.token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 })
    }
    orgId = mandat.organization_id
  } else {
    const auth = await requireApiUser()
    if ('error' in auth) return auth.error
    orgId = auth.user.organizationId
  }

  const { data: poei } = await supabase.from('poei')
    .select('id, numero, date_debut, date_fin, client_id, client:client_id(raison_sociale, nom_commercial, siret, adresse, code_postal, ville)')
    .eq('id', params.id).eq('organization_id', orgId).single()
  if (!poei) return NextResponse.json({ error: 'Projet POEI introuvable' }, { status: 404 })

  const [{ data: org }, { data: mandat }, { data: candidats }, { data: contacts }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('poei_mandats').select('date_emission, signed_at, signature_data, signataire_nom')
      .eq('poei_id', params.id).eq('organization_id', orgId).maybeSingle(),
    supabase.from('poei_candidats').select('apprenant:apprenant_id(prenom, nom)').eq('poei_id', params.id),
    (poei as any).client_id
      ? supabase.from('contacts').select('prenom, nom, est_signataire, est_principal').eq('client_id', (poei as any).client_id)
      : Promise.resolve({ data: [] as any[] }),
  ])

  // Le gérant = contact référent de la fiche client, source unique.
  const ref = (contacts || []).find((c: any) => c.est_signataire)
    || (contacts || []).find((c: any) => c.est_principal)
    || (contacts || [])[0]
  const gerantNom = (mandat as any)?.signataire_nom
    || (ref ? [ref.prenom, ref.nom].filter(Boolean).join(' ').trim() : null)

  const buffer = await renderToBuffer(createElement(MandatPoeiPDF, {
    org,
    poei,
    client: (poei as any).client,
    gerantNom,
    candidats: (candidats || []).map((c: any) => c.apprenant).filter(Boolean),
    dateEmission: (mandat as any)?.date_emission || new Date().toISOString().slice(0, 10),
    signature: (mandat as any)?.signed_at
      ? { data: (mandat as any).signature_data, nom: (mandat as any).signataire_nom, date: (mandat as any).signed_at }
      : null,
  }) as any)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Mandat_POEI_${((poei as any).numero || params.id).replace(/[^\w-]/g, '_')}.pdf"`,
    },
  })
}
