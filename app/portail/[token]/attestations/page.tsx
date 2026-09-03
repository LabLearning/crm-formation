import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AttestationsClient } from './AttestationsClient'
import { ToastProvider } from '@/components/ui'

export const dynamic = 'force-dynamic'

/**
 * Attestations d'assiduité et de règlement AGEFICE de l'apprenant : le
 * dirigeant signe ici son attestation (cartouche « Le stagiaire » du PDF).
 * Signable une fois le règlement enregistré — l'attestation certifie aussi
 * le paiement.
 */
export default async function PortalAttestationsPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'apprenant') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()
  const { data: dossiers } = await supabase
    .from('dossiers_agefice')
    .select('id, numero_dossier, date_debut_formation, date_fin_formation, duree_heures, cout_pedagogique, mode_reglement, date_reglement, signature_stagiaire_data, signature_stagiaire_date, formation:formation_id(intitule)')
    .eq('apprenant_id', context.apprenant.id)
    .order('created_at', { ascending: false })

  const lignes = ((dossiers || []) as any[]).map((d) => ({
    id: d.id,
    numero: d.numero_dossier,
    intitule: d.formation?.intitule || 'Formation',
    debut: d.date_debut_formation,
    fin: d.date_fin_formation,
    duree: d.duree_heures,
    signee: !!d.signature_stagiaire_data,
    signeeLe: d.signature_stagiaire_date,
    // Signable seulement après enregistrement du règlement : l'attestation
    // certifie l'assiduité ET le paiement.
    signable: !d.signature_stagiaire_data && !!d.mode_reglement,
  }))

  return <ToastProvider><AttestationsClient token={params.token} lignes={lignes} /></ToastProvider>
}
