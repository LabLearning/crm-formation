import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { AttestationAgeficePDF } from '@/lib/pdf/attestation-agefice-pdf'

/**
 * Attestation d'assiduité et de règlement (modèle AGEFICE 2025/2026)
 * pour un dossier AGEFICE — [id] = dossier.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error

  const supabase = await createServiceRoleClient()
  const { data: dossier } = await supabase.from('dossiers_agefice')
    .select('*, client:client_id(raison_sociale, nom_commercial), apprenant:apprenant_id(civilite, prenom, nom), formation:formation_id(intitule, duree_heures)')
    .eq('id', params.id).eq('organization_id', auth.user.organizationId).maybeSingle()
  if (!dossier) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

  // Session : formateur + nombre de participants réels
  let formateurNom: string | null = null
  let nbParticipants: number | null = null
  if (dossier.session_id) {
    const { data: sess } = await supabase.from('sessions')
      .select('formateur:formateurs(prenom, nom)')
      .eq('id', dossier.session_id).maybeSingle()
    formateurNom = (sess as any)?.formateur ? `${(sess as any).formateur.prenom} ${(sess as any).formateur.nom}` : null
    const { count } = await supabase.from('inscriptions')
      .select('*', { count: 'exact', head: true }).eq('session_id', dossier.session_id)
    nbParticipants = count || 1
  }

  const { data: orgRaw } = await supabase.from('organizations').select('*').eq('id', auth.user.organizationId).single()
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)

  const client = (dossier as any).client
  const montant = dossier.cout_pedagogique || dossier.montant_demande || null

  const buffer = await renderToBuffer(
    createElement(AttestationAgeficePDF, {
      org,
      stagiaire: (dossier as any).apprenant || {},
      entreprise: client?.nom_commercial || client?.raison_sociale || null,
      formation: (dossier as any).formation || {},
      dateDebut: dossier.date_debut_formation,
      dateFin: dossier.date_fin_formation,
      formateurNom,
      nbParticipants,
      modalite: dossier.modalite || 'presentiel',
      heuresPrevues: dossier.duree_heures ?? (dossier as any).formation?.duree_heures ?? null,
      heuresRealisees: dossier.duree_heures ?? null,
      montantHt: montant,
      modeReglement: dossier.mode_reglement,
      referenceReglement: dossier.reference_reglement,
      dateReglement: dossier.date_reglement,
      signatureStagiaire: dossier.signature_stagiaire_data || null,
      signatureStagiaireDate: dossier.signature_stagiaire_date || null,
    }) as any,
  )
  const nom = (dossier as any).apprenant?.nom || 'stagiaire'
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="attestation-assiduite-reglement-${nom}.pdf"`,
    },
  })
}
