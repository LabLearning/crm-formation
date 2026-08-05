import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CertificatSignatureClient } from './CertificatSignatureClient'

export const dynamic = 'force-dynamic'

export default async function CertificatSignerPage({ params }: { params: { token: string } }) {
  const supabase = await createServiceRoleClient()

  const { data: sig } = await supabase
    .from('certificat_signatures')
    .select(`
      id, token, token_expires_at, signed_at, date_signature, signature_data,
      apprenant:apprenants(prenom, nom, entreprise),
      poei:poei(id, date_debut, date_fin, duree_heures, poste_vise,
        formation:formation_id(intitule, duree_heures),
        client:client_id(raison_sociale, nom_commercial)),
      organization:organizations(name, logo_url)
    `)
    .eq('token', params.token)
    .maybeSingle()

  if (!sig) redirect('/portail/expired')
  if (sig.token_expires_at && new Date(sig.token_expires_at) < new Date()) redirect('/portail/expired')

  return (
    <div className="min-h-screen bg-surface-50">
      <CertificatSignatureClient sig={sig as any} token={params.token} />
    </div>
  )
}
