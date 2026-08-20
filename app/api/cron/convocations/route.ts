/**
 * Cron J-3 : envoie convocations apprenants + fiche mission formateur
 * pour toutes les sessions qui démarrent dans 3 jours et n'ont pas
 * encore reçu de convocations.
 *
 * Appel externe (cron Vercel ou manuel) :
 *   GET /api/cron/convocations?secret=...
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Auth : Vercel Cron envoie Authorization: Bearer <CRON_SECRET>
  const unauthorized = verifyCronSecret(req)
  if (unauthorized) return unauthorized

  const supabase = await createServiceRoleClient()

  // Fenêtre J+1 → J+3 : l'envoi vise J-3, mais une session créée après ce
  // jalon doit quand même recevoir sa convocation — au plus tard la veille.
  // Le garde convocations_sent_at nul assure qu'une session n'est traitée
  // qu'une seule fois.
  const demain = new Date(); demain.setDate(demain.getDate() + 1)
  const jPlus3 = new Date(); jPlus3.setDate(jPlus3.getDate() + 3)

  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      id, organization_id, reference, date_debut, date_fin, lieu, horaires,
      formateur_id,
      formation:formation_id(intitule),
      formateur:formateurs(prenom, nom, email, user_id)
    `)
    .gte('date_debut', demain.toISOString().split('T')[0])
    .lte('date_debut', jPlus3.toISOString().split('T')[0])
    .is('convocations_sent_at', null)
    .neq('status', 'annulee')
    .neq('status', 'terminee')

  const { createNotification, sendDocumentEmail, blocDocumentsAccueil } = await import('@/lib/email')
  const { sendWhatsAppTemplate } = await import('@/lib/whatsapp')
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { createElement } = await import('react')
  const { ConvocationPDF } = await import('@/lib/pdf/convocation-pdf')

  let processed = 0
  let totalApprenants = 0
  let totalWhatsApp = 0
  let totalEmails = 0

  // Cache des org pour éviter de re-fetcher à chaque apprenant
  const orgCache: Record<string, any> = {}
  const getOrg = async (id: string) => {
    if (orgCache[id]) return orgCache[id]
    const { data } = await supabase.from('organizations').select('*').eq('id', id).single()
    orgCache[id] = data
    return data
  }

  const fmtDateLong = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  for (const sess of sessions || []) {
    const { data: inscriptions } = await supabase
      .from('inscriptions')
      .select('apprenant:apprenants(id, civilite, prenom, nom, email, user_id, whatsapp, whatsapp_opt_in)')
      .eq('session_id', sess.id)
      .not('status', 'in', '("annule","abandonne")')

    const formationNom = (sess as any).formation?.intitule || 'Formation'
    const dateStr = new Date(sess.date_debut).toLocaleDateString('fr-FR')
    const dateDebutLong = fmtDateLong(sess.date_debut)
    const dateFinLong = fmtDateLong(sess.date_fin || sess.date_debut)
    const lieuStr = sess.lieu || 'le lieu indiqué dans votre convocation'

    // Notifier chaque apprenant qui a un user_id
    for (const ins of inscriptions || []) {
      const a = (ins as any).apprenant
      if (a?.user_id) {
        await createNotification({
          organizationId: sess.organization_id,
          userId: a.user_id,
          titre: 'Convocation à votre formation',
          message: `Votre formation "${formationNom}" commence le ${dateStr} ${sess.lieu ? `à ${sess.lieu}` : ''}.`,
          type: 'session',
          lienUrl: `/mon-espace`,
          lienLabel: 'Voir ma formation',
          entityType: 'session',
          entityId: sess.id,
        })
        totalApprenants++
      }

      // WhatsApp (si opt-in + numéro) — template "convocation_j3" (5 variables)
      if (a?.whatsapp_opt_in && a?.whatsapp) {
        const nomComplet = [a.civilite, a.nom].filter(Boolean).join(' ').trim()
          || `${a.prenom || ''} ${a.nom || ''}`.trim()
          || 'Madame, Monsieur'
        const r = await sendWhatsAppTemplate({
          organizationId: sess.organization_id,
          to: a.whatsapp,
          toName: `${a.prenom || ''} ${a.nom || ''}`.trim(),
          template: 'convocation_j3',
          languageCode: 'fr',
          bodyParams: [
            nomComplet,        // {{1}} civilité + nom
            formationNom,      // {{2}} formation
            dateDebutLong,     // {{3}} date de début
            dateFinLong,       // {{4}} date de fin
            lieuStr,           // {{5}} adresse / lieu
          ],
          entityType: 'session',
          entityId: sess.id,
        })
        if (r.ok) totalWhatsApp++
      }

      // Email convocation (PDF joint, brandé)
      if (a?.email) {
        try {
          const org = await getOrg(sess.organization_id)
          const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
          const orgDoc = await withDocumentLogo(supabase, org)
          const formation = await supabase.from('formations').select('*').eq('id', (sess as any).formation_id).single()
          const buffer = await renderToBuffer(createElement(ConvocationPDF, {
            apprenant: a,
            session: sess,
            formation: formation.data,
            org: orgDoc,
            formateur: (sess as any).formateur,
          }) as any)
          await sendDocumentEmail({
            to: a.email,
            orgName: org?.name || 'Lab Learning',
            orgEmail: org?.email_contact || org?.email,
            orgLogoUrl: org?.logo_url,
            qualiopiCertified: org?.is_qualiopi !== false,
            recipientName: [a.civilite, a.prenom, a.nom].filter(Boolean).join(' ').trim() || 'Madame, Monsieur',
            subject: `Convocation — ${formationNom} (${dateStr})`,
            docTitle: 'Convocation à votre formation',
            intro: `Nous avons le plaisir de vous convoquer à la session de formation suivante. Vous trouverez votre convocation détaillée en pièce jointe.${blocDocumentsAccueil(org as any)}`,
            metadata: [
              ['Formation', formationNom],
              ['Début', dateDebutLong],
              ['Fin', dateFinLong],
              ['Lieu', lieuStr],
            ],
            pdfBuffer: Buffer.from(buffer),
            pdfFilename: `convocation-${a.nom || 'stagiaire'}.pdf`,
            footerNote: 'Merci de vous présenter 15 minutes avant le début de la session avec une pièce d\'identité.',
            organizationId: sess.organization_id,
            entityType: 'session',
            entityId: sess.id,
          })
          totalEmails++
        } catch (e) { console.error('[email convoc]', e) }
      }
    }

    // Repli : les apprenants SANS email reçoivent leur convocation via le
    // référent de l'établissement — un seul mail au contact du client, avec
    // la liste des stagiaires concernés (la remise est ainsi toujours prouvée).
    const sansEmail = (inscriptions || []).map((i: any) => i.apprenant).filter((a: any) => a && !a.email)
    if (sansEmail.length > 0) {
      try {
        const { data: sessClient } = await supabase
          .from('sessions').select('client_id').eq('id', sess.id).single()
        if ((sessClient as any)?.client_id) {
          const { data: contact } = await supabase
            .from('contacts').select('prenom, nom, email')
            .eq('client_id', (sessClient as any).client_id).not('email', 'is', null)
            .order('created_at', { ascending: true }).limit(1).maybeSingle()
          if ((contact as any)?.email) {
            const org = await getOrg(sess.organization_id)
            const noms = sansEmail.map((a: any) => [a.prenom, a.nom].filter(Boolean).join(' ')).join(', ')
            await sendDocumentEmail({
              to: (contact as any).email,
              orgName: org?.name || 'Lab Learning',
              orgEmail: org?.email_contact || org?.email,
              orgLogoUrl: org?.logo_url,
              qualiopiCertified: org?.is_qualiopi !== false,
              recipientName: [(contact as any).prenom, (contact as any).nom].filter(Boolean).join(' ') || 'Madame, Monsieur',
              subject: `Convocation de vos salariés — ${(sess as any).formation?.intitule || 'formation'} (${new Date(sess.date_debut).toLocaleDateString('fr-FR')})`,
              docTitle: 'Convocation à transmettre à vos salariés',
              intro: `Certains de vos salariés inscrits à la session n'ont pas d'adresse email individuelle : nous vous transmettons leur convocation, à leur remettre. Stagiaires concernés : <strong>${noms}</strong>.${blocDocumentsAccueil(org as any)}`,
              metadata: [
                ['Formation', (sess as any).formation?.intitule || ''],
                ['Début', new Date(sess.date_debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
                ['Lieu', (sess as any).lieu || 'votre établissement'],
              ],
              organizationId: sess.organization_id,
              entityType: 'session',
              entityId: sess.id,
            })
            totalEmails++
          }
        }
      } catch (e) { console.error('[convoc referent]', e) }
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
    whatsapp_envoyes: totalWhatsApp,
    emails_envoyes: totalEmails,
  })
}
