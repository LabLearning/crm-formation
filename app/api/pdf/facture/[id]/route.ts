import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { FacturePDF } from '@/lib/pdf/facture-pdf'
import type { Facture } from '@/lib/types/facture'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error

  const supabase = await createServiceRoleClient()
  // Contrôle d'org : la facture doit appartenir à l'organisation de l'appelant
  // (empêche le téléchargement inter-organisations en devinant un UUID).
  const { data: facture, error } = await supabase
    .from('factures')
    .select(`
      *,
      client:clients(raison_sociale, nom, prenom, type, email, adresse, code_postal, ville, siret, tva_intra),
      lignes:facture_lignes(*),
      paiements(*)
    `)
    .eq('id', params.id)
    .eq('organization_id', auth.user.organizationId)
    .single()

  if (error || !facture) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  }

  const { data: orgRaw } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', (facture as any).organization_id)
    .single()
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)

  // Facture POEI adressée à une agence France Travail (« pour le compte de » le client)
  let agence: any = null
  if ((facture as any).agence_ft_id) {
    const { data: ag } = await supabase.from('agences_france_travail')
      .select('*').eq('id', (facture as any).agence_ft_id).maybeSingle()
    agence = ag || null
  }

  // Détail de l'action de formation : le financeur en a besoin pour rapprocher
  // la facture de son dossier (référence, participant, dates, n° d'engagement).
  const detail: { label: string; valeur: string }[] = []
  const marker = String((facture as any).notes_internes || '').match(/\[POEI-FACT:([0-9a-f-]+):([0-9a-f-]+)\]/i)
  if (marker) {
    const CHAMPS_POEI = 'numero, duree_heures, date_debut, date_fin, numero_dossier_ft, session:session_id(reference, adresse, code_postal, ville, lieu), client:client_id(raison_sociale, adresse, code_postal, ville)'
    // `numero_engagement` n'existe qu'à partir de la migration 118 : sans repli,
    // toute la génération de factures tomberait tant qu'elle n'est pas appliquée.
    let poei: any = null
    {
      const r = await supabase.from('poei').select(`${CHAMPS_POEI}, numero_engagement`).eq('id', marker[1]).maybeSingle()
      if (r.error) {
        const r2 = await supabase.from('poei').select(CHAMPS_POEI).eq('id', marker[1]).maybeSingle()
        poei = r2.data
      } else poei = r.data
    }
    const { data: cand } = await supabase
      .from('poei_candidats')
      .select('numero_engagement, apprenant:apprenant_id(prenom, nom)')
      .eq('id', marker[2])
      .maybeSingle()

    const p: any = poei || {}
    const fr = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')
    const participant = cand
      ? `${(cand as any).apprenant?.prenom || ''} ${(cand as any).apprenant?.nom || ''}`.trim().toUpperCase()
      : ''
    const heures = Number(p.duree_heures) || 0
    const jours = heures ? Math.round(heures / 7) : 0
    const lieu = [p.session?.adresse || p.session?.lieu, p.session?.code_postal, p.session?.ville]
      .filter(Boolean).join(', ')
      || [p.client?.adresse, p.client?.code_postal, p.client?.ville].filter(Boolean).join(', ')

    detail.push({ label: 'Type', valeur: 'INTER' })
    if (p.session?.reference) detail.push({ label: 'Référence', valeur: p.session.reference })
    if (participant) detail.push({ label: 'Participant', valeur: participant })
    if (p.date_debut) detail.push({ label: 'Dates', valeur: `du ${fr(p.date_debut)} au ${fr(p.date_fin)}` })
    if (heures) detail.push({ label: 'Durée', valeur: `${heures}h${jours ? ` (${jours} jours)` : ''}` })
    if (lieu) detail.push({ label: 'Lieu', valeur: lieu })
    // France Travail engage chaque candidat séparément : le numéro est le sien.
    // On prend celui figé sur la facture, puis celui du candidat, et à défaut
    // celui du dossier.
    const engagement = (facture as any).numero_engagement
      || (cand as any)?.numero_engagement || p.numero_engagement || p.numero_dossier_ft
    if (engagement) detail.push({ label: "N° d'engagement", valeur: String(engagement) })
  }

  const buffer = await renderToBuffer(
    createElement(FacturePDF, { facture: facture as Facture, org, agence, detail }) as any
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${facture.numero}.pdf"`,
      'Cache-Control': 'private, max-age=0',
    },
  })
}
