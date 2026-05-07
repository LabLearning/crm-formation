/**
 * Cron J-3 : envoie convocations apprenants + fiche mission formateur
 * pour toutes les sessions qui démarrent dans 3 jours et n'ont pas
 * encore reçu de convocations.
 *
 * Appel externe (cron Vercel ou manuel) :
 *   GET /api/cron/convocations?secret=...
 */
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Auth simple par secret query param (pour Vercel Cron)
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()

  // Date cible : J+3 (sessions qui démarrent dans 3 jours)
  const target = new Date()
  target.setDate(target.getDate() + 3)
  const targetDate = target.toISOString().split('T')[0]

  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      id, organization_id, reference, date_debut, date_fin, lieu, horaires,
      formateur_id,
      formation:formation_id(intitule),
      formateur:formateurs(prenom, nom, email, user_id)
    `)
    .eq('date_debut', targetDate)
    .is('convocations_sent_at', null)
    .neq('status', 'annulee')
    .neq('status', 'terminee')

  let processed = 0
  let totalApprenants = 0

  for (const sess of sessions || []) {
    const { data: inscriptions } = await supabase
      .from('inscriptions')
      .select('apprenant:apprenants(id, prenom, nom, email, user_id)')
      .eq('session_id', sess.id)
      .not('status', 'in', '("annule","abandonne")')

    const { createNotification } = await import('@/lib/email')

    // Notifier chaque apprenant qui a un user_id
    for (const ins of inscriptions || []) {
      const a = (ins as any).apprenant
      if (a?.user_id) {
        await createNotification({
          organizationId: sess.organization_id,
          userId: a.user_id,
          titre: 'Convocation à votre formation',
          message: `Votre formation "${(sess as any).formation?.intitule || 'Formation'}" commence le ${new Date(sess.date_debut).toLocaleDateString('fr-FR')} ${sess.lieu ? `à ${sess.lieu}` : ''}.`,
          type: 'session',
          lienUrl: `/mon-espace`,
          lienLabel: 'Voir ma formation',
          entityType: 'session',
          entityId: sess.id,
        })
        totalApprenants++
      }
    }

    // Notifier le formateur (fiche mission récap)
    const formateur = (sess as any).formateur
    if (formateur?.user_id) {
      const nbParticipants = (inscriptions || []).length
      await createNotification({
        organizationId: sess.organization_id,
        userId: formateur.user_id,
        titre: 'Fiche de mission — formation à J-3',
        message: `Votre mission "${(sess as any).formation?.intitule}" démarre le ${new Date(sess.date_debut).toLocaleDateString('fr-FR')}. ${nbParticipants} apprenant${nbParticipants > 1 ? 's' : ''} inscrit${nbParticipants > 1 ? 's' : ''}.`,
        type: 'session',
        lienUrl: `/dashboard/sessions/${sess.id}`,
        lienLabel: 'Voir la fiche',
        entityType: 'session',
        entityId: sess.id,
      })
    }

    await supabase
      .from('sessions')
      .update({ convocations_sent_at: new Date().toISOString() })
      .eq('id', sess.id)

    processed++
  }

  return NextResponse.json({
    targetDate,
    sessions_processed: processed,
    apprenants_notifies: totalApprenants,
  })
}
