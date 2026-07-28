import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { FactureFormateurPDF, type FactureModele } from '@/lib/pdf/facture-formateur-pdf'

/**
 * Aperçu d'un modèle de facture formateur avec des données d'exemple.
 * Réservé aux utilisateurs du dashboard (choix du modèle à la création).
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error

  const modele = (req.nextUrl.searchParams.get('modele') || 'epure') as FactureModele

  const supabase = await createServiceRoleClient()
  const { data: orgRaw } = await supabase.from('organizations').select('*').eq('id', auth.user.organizationId).single()
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)

  const formateur = {
    civilite: 'M.', prenom: 'Jean', nom: 'Dupont',
    adresse: '12 rue des Écoles', code_postal: '75005', ville: 'Paris',
    siret: '123 456 789 00012', numero_da: '11 75 00000 75', email: 'jean.dupont@exemple.fr',
  }
  const facture = {
    numero: 'FF-2026-001', reference_externe: '2026-014',
    date_emission: null, created_at: new Date(2026, 0, 15).toISOString(),
    objet: 'Prestation de formation — Hygiène alimentaire (HACCP)',
    session: { reference: 'ADF_2026-014' },
    montant_ht: 1200, taux_tva: 0, montant_tva: 0, montant_ttc: 1200,
  }

  const buffer = await renderToBuffer(
    createElement(FactureFormateurPDF, { facture, formateur, org, modele }) as any
  )
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="apercu-facture-${modele}.pdf"`,
      'Cache-Control': 'private, max-age=0',
    },
  })
}
