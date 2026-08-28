import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { estFormationHygiene } from '@/lib/formation-hygiene'
import { DiplomeEtablissementPDF } from '@/lib/pdf/diplome-etablissement-pdf'

/** Diplôme d'établissement (hygiène) — [id] = session. Document d'affichage. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error

  const supabase = await createServiceRoleClient()
  const { data: sess } = await supabase.from('sessions')
    .select('id, date_debut, date_fin, ville, formation:formation_id(intitule, categorie), client:client_id(raison_sociale, nom_commercial, ville), formateur:formateurs(prenom, nom)')
    .eq('id', params.id).eq('organization_id', auth.user.organizationId).maybeSingle()
  if (!sess) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  if (!estFormationHygiene((sess as any).formation)) {
    return NextResponse.json({ error: "Cette session ne porte pas sur l'hygiène alimentaire" }, { status: 400 })
  }
  const client: any = (sess as any).client
  if (!client) return NextResponse.json({ error: 'Aucun établissement rattaché à la session' }, { status: 400 })

  const { data: insc } = await supabase.from('inscriptions')
    .select('apprenant:apprenants(prenom, nom)')
    .eq('session_id', sess.id).not('status', 'in', '("annule","abandonne")')

  const { data: orgRaw } = await supabase.from('organizations').select('*').eq('id', auth.user.organizationId).single()
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)

  const buffer = await renderToBuffer(
    createElement(DiplomeEtablissementPDF, {
      org,
      etablissement: client.nom_commercial || client.raison_sociale || 'Établissement',
      ville: client.ville || (sess as any).ville || null,
      formationIntitule: (sess as any).formation?.intitule || 'Hygiène alimentaire',
      dateDebut: sess.date_debut,
      dateFin: sess.date_fin,
      stagiaires: (insc || []).map((i: any) => i.apprenant).filter(Boolean),
      formateurNom: (sess as any).formateur ? `${(sess as any).formateur.prenom} ${(sess as any).formateur.nom}` : null,
    }) as any,
  )
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="diplome-${(client.nom_commercial || client.raison_sociale || 'etablissement').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf"`,
    },
  })
}
