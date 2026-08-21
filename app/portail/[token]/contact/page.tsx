import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContactFormateurClient } from './ContactFormateurClient'

export const dynamic = 'force-dynamic'

/**
 * Contact formateur : l'apprenant écrit directement au formateur de ses
 * sessions ; le fil de discussion vit dans le CRM, le formateur lit et
 * répond depuis son propre espace.
 */
export default async function PortalContactPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'apprenant') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()
  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('session:session_id(id, date_debut, formateur:formateur_id(id, prenom, nom), formation:formation_id(intitule))')
    .eq('apprenant_id', context.apprenant.id)

  // Un choix par formateur rencontré, le plus récent d'abord.
  const parFormateur = new Map<string, { id: string; nom: string; formation: string; date: string }>()
  for (const i of (inscriptions || []) as any[]) {
    const f = i.session?.formateur
    if (!f?.id) continue
    const existant = parFormateur.get(f.id)
    const date = String(i.session?.date_debut || '')
    if (!existant || date > existant.date) {
      parFormateur.set(f.id, {
        id: f.id,
        nom: `${f.prenom || ''} ${f.nom || ''}`.trim(),
        formation: i.session?.formation?.intitule || '',
        date,
      })
    }
  }
  const formateurs = [...parFormateur.values()].sort((a, b) => b.date.localeCompare(a.date))

  const { data: messages } = await supabase
    .from('portal_messages')
    .select('id, formateur_id, auteur, contenu, created_at')
    .eq('apprenant_id', context.apprenant.id)
    .order('created_at')

  return (
    <ContactFormateurClient
      token={params.token}
      formateurs={formateurs}
      messages={(messages || []) as any[]}
    />
  )
}
