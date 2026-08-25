import { resolveFormateur } from '../_formateur/guard'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ToastProvider } from '@/components/ui'
import { StudioClient } from '@/components/formateur/StudioClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Studio documents du formateur (espace connecté) : photos/notes de mission
 * structurées par l'IA en PDF brandé aux couleurs de la franchise.
 */
export default async function EspaceStudioPage() {
  const { formateurId } = await resolveFormateur()
  const supabase = await createServiceRoleClient()

  const [{ data: sessions }, { data: generes }] = await Promise.all([
    supabase.from('sessions')
      .select('id, reference, date_debut, status, client:client_id(raison_sociale, nom_commercial, franchise:franchise_id(nom)), formation:formation_id(intitule)')
      .eq('formateur_id', formateurId)
      .order('date_debut', { ascending: false })
      .limit(40),
    supabase.from('documents')
      .select('id, nom, created_at, session_id')
      .eq('formateur_id', formateurId)
      .eq('origine', 'studio_formateur')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <ToastProvider>
      <StudioClient
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
