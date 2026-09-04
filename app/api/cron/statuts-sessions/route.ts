/**
 * Cron quotidien — statut des sessions piloté par les DATES.
 * Seules les dates de session font foi :
 *   • date_debut dans le futur      → session à venir (statut métier conservé :
 *     planifiee / confirmee / validee)
 *   • aujourd'hui dans la plage     → en_cours
 *   • date_fin passée               → terminee
 * Les sessions annulées ne sont jamais touchées.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncSessionStatuts } from '@/lib/session-statut'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const unauthorized = verifyCronSecret(req)
  if (unauthorized) return unauthorized

  const supabase = await createServiceRoleClient()
  const res = await syncSessionStatuts(supabase)

  // Clôture automatique : les attestations d'hygiène partent au client dès
  // que la session bascule en « terminée » (idempotent, sessions hygiène only).
  // ?rattrapage=1 : traite aussi TOUTES les sessions déjà terminées (la garde
  // email_logs évite tout doublon) — utile après une période où le hook manquait.
  const rattrapage = new URL(req.url).searchParams.get('rattrapage') === '1'
  let aTraiter: { id: string; organization_id: string }[] = res.terminees || []
  if (rattrapage) {
    const { data: terminees } = await supabase.from('sessions')
      .select('id, organization_id').eq('status', 'terminee').gte('date_fin', '2026-06-01')
    aTraiter = terminees || []
  }
  let hygieneEnvoyees = 0
  const erreurs: string[] = []
  const { envoyerHygieneAutomatique } = await import('@/lib/hygiene-auto')
  for (const s of aTraiter) {
    try {
      await envoyerHygieneAutomatique(supabase, s.id, s.organization_id)
      hygieneEnvoyees++
    } catch (e: any) { erreurs.push(`${s.id}: ${e?.message?.slice(0, 80)}`); console.error('[hygiene auto]', s.id, e) }
  }
  return NextResponse.json({ ...res, hygiene_traitees: hygieneEnvoyees, hygiene_erreurs: erreurs })
}
