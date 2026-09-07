import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { zipSync } from 'fflate'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { PlanningPoeiPDF } from '@/lib/pdf/planning-poei-pdf'

export const dynamic = 'force-dynamic'

const safeName = (s: string) => (s || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'document'

/**
 * Plannings de travail des candidats POEI. `id` = POEI.
 * Sans paramètre → ZIP de tous les plannings ; ?candidat=… → un seul PDF.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error
  const supabase = await createServiceRoleClient()
  const orgId = auth.user.organizationId

  const { data: poei } = await supabase
    .from('poei')
    .select('id, numero, poste_vise, numero_dossier_ft, client:client_id(raison_sociale, nom_commercial)')
    .eq('id', params.id).eq('organization_id', orgId).single()
  if (!poei) return NextResponse.json({ error: 'Projet POEI introuvable' }, { status: 404 })

  const { data: orgRaw } = await supabase.from('organizations').select('*').eq('id', orgId).single()
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)

  const candidatFiltre = req.nextUrl.searchParams.get('candidat')
  let qc = supabase.from('poei_candidats')
    .select('id, identifiant_ft, apprenant:apprenants(prenom, nom)')
    .eq('poei_id', params.id)
  if (candidatFiltre) qc = qc.eq('id', candidatFiltre)
  const { data: candidats } = await qc

  const { data: jours } = await supabase.from('poei_plannings')
    .select('candidat_id, date, repos, creneau1_debut, creneau1_fin, creneau2_debut, creneau2_fin, note')
    .eq('poei_id', params.id).order('date')

  const parCandidat = new Map<string, any[]>()
  for (const j of jours || []) {
    if (!parCandidat.has(j.candidat_id)) parCandidat.set(j.candidat_id, [])
    parCandidat.get(j.candidat_id)!.push(j)
  }

  const employeur = (poei as any).client?.nom_commercial || (poei as any).client?.raison_sociale || null
  const avecPlanning = (candidats || []).filter((c) => (parCandidat.get(c.id) || []).length > 0)
  if (avecPlanning.length === 0) {
    return NextResponse.json({ error: 'Aucun planning à télécharger' }, { status: 404 })
  }

  const nomDe = (c: any) => safeName(`${c.apprenant?.prenom || ''} ${c.apprenant?.nom || ''}`) || c.id.slice(0, 8)
  const render = (c: any) => renderToBuffer(
    createElement(PlanningPoeiPDF, {
      org, poei: poei as any, employeur,
      candidatNom: `${c.apprenant?.prenom || ''} ${c.apprenant?.nom || ''}`.trim(),
      identifiantFt: c.identifiant_ft,
      jours: parCandidat.get(c.id) || [],
    }) as any,
  )

  if (avecPlanning.length === 1) {
    const c = avecPlanning[0]
    const buffer = await render(c)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Planning - ${nomDe(c)}.pdf"`,
        'Cache-Control': 'private, max-age=0',
      },
    })
  }

  const files: Record<string, Uint8Array> = {}
  for (const c of avecPlanning) files[`Planning - ${nomDe(c)}.pdf`] = new Uint8Array(await render(c))
  const zipped = zipSync(files, { level: 0 })
  const zipName = safeName(`Plannings POEI - ${employeur || (poei as any).numero || 'projet'}`) + '.zip'
  return new NextResponse(new Uint8Array(zipped), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Cache-Control': 'private, max-age=0',
    },
  })
}
