import { createServiceRoleClient } from '@/lib/supabase/server'
import { ContratFormateurSignatureClient } from './ContratFormateurSignatureClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ContratFormateurSignaturePage({ params }: { params: { token: string } }) {
  const supabase = await createServiceRoleClient()

  const { data: contrat } = await supabase
    .from('contrats_formateur')
    .select(`
      id, numero, status, tarif_journalier, nombre_jours, montant_ht,
      signature_token_expires_at, signature_formateur_date, signature_formateur_nom,
      organization:organizations(name, logo_url),
      formateur:formateurs(prenom, nom, email),
      session:sessions(reference, date_debut, date_fin, lieu,
        formation:formation_id(intitule)
      )
    `)
    .eq('signature_token', params.token)
    .maybeSingle()

  if (!contrat) redirect('/portail/expired')
  if (contrat.signature_token_expires_at && new Date(contrat.signature_token_expires_at) < new Date()) {
    redirect('/portail/expired')
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <ContratFormateurSignatureClient contrat={contrat as any} token={params.token} />
    </div>
  )
}
