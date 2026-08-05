import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { PointagePapierPDF, type PointageSession } from '@/lib/pdf/pointage-papier-pdf'

export const dynamic = 'force-dynamic'

/**
 * Feuille de pointage papier des présences NON RENSEIGNÉES (sessions terminées,
 * inscriptions sans taux d'assiduité). Cases Présent/Absent à cocher, à imprimer.
 */
export async function GET(_req: NextRequest) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error
  const orgId = auth.user.organizationId
  const supabase = await createServiceRoleClient()

  const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single()

  const { data: sess } = await supabase
    .from('sessions')
    .select('id, reference, intitule, date_debut, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial)')
    .eq('organization_id', orgId).eq('status', 'terminee')
  const smap = new Map((sess || []).map((s: any) => [s.id, s]))
  const sids = Array.from(smap.keys())

  // Inscriptions non renseignées (taux d'assiduité nul), non annulées
  const rows: any[] = []
  for (let i = 0; i < sids.length; i += 100) {
    const chunk = sids.slice(i, i + 100)
    const { data } = await supabase
      .from('inscriptions')
      .select('session_id, apprenant:apprenants(prenom, nom)')
      .in('session_id', chunk)
      .is('taux_assiduite', null)
      .not('status', 'in', '("annule","abandonne")')
    if (data) rows.push(...data)
  }

  const byS = new Map<string, string[]>()
  for (const r of rows) {
    const nom = `${r.apprenant?.prenom || ''} ${r.apprenant?.nom || ''}`.trim()
    if (!nom) continue
    if (!byS.has(r.session_id)) byS.set(r.session_id, [])
    byS.get(r.session_id)!.push(nom)
  }

  const sessions: PointageSession[] = Array.from(byS.entries())
    .map(([sid, names]) => {
      const s: any = smap.get(sid)
      return {
        date: s?.date_debut ? new Date(s.date_debut).toLocaleDateString('fr-FR') : '',
        reference: s?.reference || '',
        client: s?.client?.nom_commercial || s?.client?.raison_sociale || '',
        formation: s?.formation?.intitule || s?.intitule || '',
        participants: names.sort((a, b) => a.localeCompare(b)).map((nom) => ({ nom })),
      }
    })
    .sort((a, b) => a.date.split('/').reverse().join('').localeCompare(b.date.split('/').reverse().join('')))

  const editedOn = new Date().toLocaleDateString('fr-FR')
  const buffer = await renderToBuffer(
    createElement(PointagePapierPDF, { sessions, orgName: org?.name || 'Lab Learning', editedOn }) as any,
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="feuille-pointage-a-confirmer.pdf"`,
      'Cache-Control': 'private, max-age=0',
    },
  })
}
