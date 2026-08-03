import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { zipSync } from 'fflate'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { CertificatRealisationPDF } from '@/lib/pdf/certificat-realisation-pdf'

function safeName(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-') || 'stagiaire'
}

// Télécharge les certificats de réalisation d'un projet POEI (1 PDF par stagiaire, ZIP)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error

  const supabase = await createServiceRoleClient()

  const { data: poei } = await supabase
    .from('poei')
    .select('id, numero, organization_id, session_id, client:clients(raison_sociale)')
    .eq('id', params.id).eq('organization_id', auth.user.organizationId).single()
  if (!poei) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  if (!poei.session_id) return NextResponse.json({ error: 'Aucune session liée au projet' }, { status: 400 })

  const { data: sess } = await supabase.from('sessions').select('*').eq('id', poei.session_id).single()
  if (!sess) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  const { data: formation } = await supabase.from('formations').select('*').eq('id', sess.formation_id).single()
  const { data: orgRaw } = await supabase.from('organizations').select('*').eq('id', poei.organization_id).single()
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)

  const { data: cands } = await supabase
    .from('poei_candidats')
    .select('apprenant:apprenants(*)')
    .eq('poei_id', params.id)
  const apprenants = (cands || []).map((c: any) => c.apprenant).filter(Boolean)
  if (apprenants.length === 0) return NextResponse.json({ error: 'Aucun stagiaire à certifier' }, { status: 404 })

  const files: Record<string, Uint8Array> = {}
  const usedNames = new Set<string>()
  for (const a of apprenants) {
    const { data: ema } = await supabase.from('emargements').select('est_present')
      .eq('session_id', sess.id).eq('apprenant_id', a.id)
    const total = (ema || []).length
    const present = (ema || []).filter((e: any) => e.est_present).length
    const assiduite = total > 0 ? Math.round((present / total) * 100) : undefined
    const heuresPresence = formation?.duree_heures && assiduite ? Math.round(formation.duree_heures * assiduite / 100) : undefined

    const buffer = await renderToBuffer(
      createElement(CertificatRealisationPDF, { apprenant: a, session: sess, formation, org, assiduite, heuresPresence }) as any,
    )
    let base = `Certificat realisation - ${safeName(`${a.prenom || ''} ${a.nom || ''}`)}`
    let name = `${base}.pdf`
    let n = 2
    while (usedNames.has(name)) { name = `${base}-${n++}.pdf` }
    usedNames.add(name)
    files[name] = new Uint8Array(buffer)
  }

  const zipped = zipSync(files, { level: 0 })
  const zipName = `Certificats POEI - ${safeName((poei as any).client?.raison_sociale || poei.numero || 'projet')}.zip`

  return new NextResponse(new Uint8Array(zipped), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Cache-Control': 'private, max-age=0',
    },
  })
}
