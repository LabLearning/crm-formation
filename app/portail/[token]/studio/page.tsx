import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ToastProvider } from '@/components/ui'
import { StudioClient } from './StudioClient'

export const dynamic = 'force-dynamic'

/**
 * Studio documents du formateur : ses sessions, ses générations passées —
 * l'IA met en page ses notes de mission aux couleurs de la franchise.
 */
export default async function PortalStudioPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'formateur') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()
  const [{ data: sessions }, { data: generes }] = await Promise.all([
    supabase.from('sessions')
      .select('id, reference, date_debut, status, client:client_id(raison_sociale, nom_commercial, franchise:franchise_id(nom)), formation:formation_id(intitule)')
      .eq('formateur_id', context.formateur.id)
      .order('date_debut', { ascending: false })
      .limit(40),
    supabase.from('documents')
      .select('id, nom, created_at, session_id')
      .eq('formateur_id', context.formateur.id)
      .eq('origine', 'studio_formateur')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <ToastProvider>
      <StudioClient
        token={params.token}
        sessions={(sessions || []).map((s: any) => ({
          id: s.id,
          libelle: [
            s.formation?.intitule,
            s.client?.franchise?.nom || s.client?.nom_commercial || s.client?.raison_sociale,
            s.date_debut ? new Date(s.date_debut).toLocaleDateString('fr-FR') : null,
          ].filter(Boolean).join(' — '),
          franchise: s.client?.franchise?.nom || null,
        }))}
        generes={(generes || []) as any[]}
      />
    </ToastProvider>
  )
}
