import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MesEmargementsClient } from './MesEmargementsClient'

export const dynamic = 'force-dynamic'

/**
 * Émargements de l'apprenant sur son portail : sa présence par session,
 * demi-journée par demi-journée — et la signature directe des créneaux
 * passés non encore signés.
 */
export default async function PortalEmargementsPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'apprenant') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()
  const { data: emargements } = await supabase
    .from('emargements')
    .select('id, session_id, date, creneau, est_present, motif_absence, signature_data, session:session_id(reference, formation:formation_id(intitule))')
    .eq('apprenant_id', context.apprenant.id)
    .order('date', { ascending: false })

  const aujourdhui = new Date().toISOString().slice(0, 10)
  const parSession = new Map<string, any[]>()
  for (const e of (emargements || []) as any[]) {
    if (!parSession.has(e.session_id)) parSession.set(e.session_id, [])
    parSession.get(e.session_id)!.push(e)
  }

  const groupes = [...parSession.entries()].map(([sessionId, lignes]) => ({
    sessionId,
    titre: lignes[0].session?.formation?.intitule || lignes[0].session?.reference || 'Formation',
    lignes: lignes.map((l: any) => ({
      id: l.id,
      date: String(l.date),
      creneau: l.creneau,
      est_present: l.est_present,
      motif_absence: l.motif_absence,
      signe: !!l.signature_data,
      // Signable : créneau passé (ou du jour), pas encore signé, pas une
      // absence motivée.
      signable: !l.signature_data && String(l.date) <= aujourdhui && l.est_present !== false,
    })),
  }))

  return <MesEmargementsClient token={params.token} groupes={groupes} />
}
