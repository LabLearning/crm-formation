import { NextResponse } from 'next/server'
import { runDendreoSync } from '@/lib/dendreo-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // la synchro complète peut prendre 1-2 min

// Synchro quotidienne Dendreo → CRM (Vercel Cron). Idempotente : n'insère que
// les nouveaux enregistrements (sessions, participants…) créés dans Dendreo.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  // Fail-closed : absence de CRON_SECRET = refus, jamais ouverture
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const t0 = Date.now()
  try {
    const report = await runDendreoSync(true)
    const totalNew = Object.values(report).reduce((s: number, v: any) => s + (v.new || 0), 0)
    // Rattache automatiquement les QCM des formations aux sessions (dont celles
    // qui viennent d'être importées de Dendreo)
    let qcmLinks = 0
    try {
      const { createServiceRoleClient } = await import('@/lib/supabase/server')
      const { backfillOrgQcmSessions } = await import('@/lib/qcm-autolink')
      const supabase = await createServiceRoleClient()
      qcmLinks = await backfillOrgQcmSessions(supabase, process.env.DENDREO_DEFAULT_ORG || 'ff747dfe-c034-44d8-98d7-e53892263fb5')
    } catch (e) { console.error('[cron dendreo-sync] autolink QCM', e) }
    console.log(`[cron dendreo-sync] ${totalNew} nouveaux, ${qcmLinks} liens QCM en ${Date.now() - t0}ms`, JSON.stringify(report))
    return NextResponse.json({ ok: true, ms: Date.now() - t0, totalNew, qcmLinks, report })
  } catch (e: any) {
    console.error('[cron dendreo-sync] échec', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Erreur' }, { status: 500 })
  }
}
