/**
 * Cron J+90 : crée les QCM "satisfaction_froid" pour les apprenants
 * des sessions terminées il y a 90 jours.
 * Appelé chaque matin par Vercel Cron.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { seedQcmReponsesForSession, notifyApprenantsForQcm } from '@/lib/qcm-auto-seed'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const unauthorized = verifyCronSecret(req)
  if (unauthorized) return unauthorized

  const supabase = await createServiceRoleClient()

  // Date cible : J-90 (sessions qui se sont terminées il y a 90 jours)
  const target = new Date()
  target.setDate(target.getDate() - 90)
  const targetDate = target.toISOString().split('T')[0]

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('date_fin', targetDate)
    .eq('status', 'terminee')

  let processed = 0
  let created = 0

  for (const s of sessions || []) {
    const r = await seedQcmReponsesForSession(supabase, s.id, 'satisfaction_froid')
    if (r.created > 0) {
      await notifyApprenantsForQcm(supabase, s.id, 'satisfaction_froid')
      created += r.created
    }
    processed++
  }

  // Relances MENSUELLES : toute session finie depuis plus de 97 jours dont des
  // stagiaires n'ont pas répondu est relancée, puis re-relancée tous les 30
  // jours (dernière relance tracée dans qcm_sessions.date_rappel_j90).
  // Un plafond par exécution étale le rattrapage des sessions anciennes sans
  // inonder les boîtes ; chaque envoi reste tracé dans email_logs.
  const PLAFOND_PAR_JOUR = 40
  let relances = 0
  const seuilFin = new Date(); seuilFin.setDate(seuilFin.getDate() - 97)
  const seuilRelance = new Date(); seuilRelance.setDate(seuilRelance.getDate() - 30)

  const { data: jalons } = await supabase
    .from('qcm_sessions')
    .select('id, session_id, date_rappel_j90, qcm:qcm_id(type), session:session_id(status, date_fin)')
    .not('session_id', 'is', null)

  const candidats = (jalons || []).filter((j: any) =>
    j.qcm?.type === 'satisfaction_froid' &&
    j.session?.status === 'terminee' &&
    j.session?.date_fin && j.session.date_fin <= seuilFin.toISOString().split('T')[0] &&
    (!j.date_rappel_j90 || j.date_rappel_j90 <= seuilRelance.toISOString().split('T')[0]),
  )
  // Les plus anciennes jamais relancées d'abord
  candidats.sort((a: any, b: any) => String(a.date_rappel_j90 || '0').localeCompare(String(b.date_rappel_j90 || '0')))

  for (const j of candidats.slice(0, PLAFOND_PAR_JOUR)) {
    const nb = await notifyApprenantsForQcm(supabase, (j as any).session_id, 'satisfaction_froid', { seulementEnAttente: true, relance: true })
    await supabase.from('qcm_sessions').update({
      rappel_j90: true,
      date_rappel_j90: new Date().toISOString().split('T')[0],
    }).eq('id', (j as any).id)
    if (Number(nb) > 0) relances++
  }

  return NextResponse.json({ targetDate, sessions_processed: processed, qcm_reponses_created: created, sessions_relancees: relances, relances_en_attente: Math.max(0, candidats.length - PLAFOND_PAR_JOUR) })
}
