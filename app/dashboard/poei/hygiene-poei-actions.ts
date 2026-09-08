'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'
import { buildDocumentEmailHtml, sendDocumentEmail } from '@/lib/email'
import { enveloppeOrg } from '@/lib/poei-emails'
import { resoudreReferent } from '@/lib/evaluation-formateur-referent'
import type { ApercuMail } from './apercu-mail-actions'

/** Intitulé réglementaire porté sur les attestations du module hygiène d'une POEI. */
const INTITULE_MODULE_HYGIENE = 'Hygiène alimentaire et prévention des risques'

/**
 * Attestations d'hygiène alimentaire des candidats + diplôme de
 * l'établissement, envoyés au référent de l'établissement en un seul email
 * (même forme que l'envoi automatique des sessions hygiène). La POEI n'est
 * pas typée « hygiène » : le module est un volet du parcours, sa durée est
 * saisie par le gestionnaire et ne peut jamais être nulle.
 */
export async function envoyerHygienePoeiAction(
  poeiId: string,
  opts: { candidatIds: string[]; heures: number; preview?: boolean },
): Promise<ActionResult & { data?: { apercus?: ApercuMail[]; referent?: { nom: string; email: string } } }> {
  const session = await getSession()
  if (['apprenant', 'formateur'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const heures = Number(opts.heures)
  // RÈGLE ABSOLUE : aucune attestation à 0 heure ne part.
  if (!(heures > 0)) return { success: false, error: 'La durée du module hygiène doit être supérieure à 0 heure' }
  if (!opts.candidatIds?.length) return { success: false, error: 'Aucun candidat sélectionné' }
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const { data: poei } = await supabase
    .from('poei')
    .select('id, numero, date_debut, date_fin, client_id, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial, ville)')
    .eq('id', poeiId).eq('organization_id', orgId).single()
  if (!poei) return { success: false, error: 'Projet POEI introuvable' }
  const p: any = poei
  if (!p.client_id) return { success: false, error: 'Aucun établissement rattaché à la POEI' }

  const referent = await resoudreReferent(supabase, p.client_id)
  if (!referent) return { success: false, error: "Aucun référent avec adresse email sur la fiche client : ajoutez un contact (référent formation, signataire ou principal)." }

  const { data: candidats } = await supabase
    .from('poei_candidats')
    .select('id, statut, apprenant:apprenants(id, civilite, prenom, nom, date_naissance, entreprise)')
    .eq('poei_id', poeiId).eq('organization_id', orgId).in('id', opts.candidatIds)
  const apprenants = (candidats || [])
    .filter((c: any) => c.statut !== 'abandonne' && c.apprenant)
    .map((c: any) => c.apprenant)
    .sort((a: any, b: any) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'))
  if (!apprenants.length) return { success: false, error: 'Aucun candidat actif parmi la sélection' }

  const { data: interventions } = await supabase
    .from('poei_interventions').select('formateur:formateur_id(prenom, nom)')
    .eq('poei_id', poeiId).order('date_debut', { ascending: true }).limit(1)
  const f: any = (interventions || [])[0]?.formateur
  const formateurNom = f ? `${f.prenom || ''} ${f.nom || ''}`.trim() : null

  const { data: orgRaw } = await supabase.from('organizations').select('*').eq('id', orgId).single()
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)
  const enveloppe = enveloppeOrg(org, orgRaw)

  const etablissement = p.client?.nom_commercial || p.client?.raison_sociale || 'votre établissement'
  const fr = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')
  const noms = apprenants.map((a: any) => `${a.prenom || ''} ${a.nom || ''}`.trim()).join(', ')
  const fichierAttestations = `attestations-hygiene-${p.numero || 'poei'}.pdf`
  const fichierDiplome = 'diplome-etablissement.pdf'

  const params = {
    recipientName: referent.nom || 'Madame, Monsieur',
    subject: `Attestations d'hygiène alimentaire — ${etablissement}`,
    docTitle: "Vos attestations d'hygiène alimentaire",
    intro: `Le parcours POEI de vos ${apprenants.length > 1 ? `${apprenants.length} collaborateurs` : 'collaborateur'} comprenait le module « ${INTITULE_MODULE_HYGIENE} ». Vous trouverez ci-joint ${apprenants.length > 1 ? 'leurs attestations' : 'son attestation'} d'hygiène alimentaire (à conserver : c'est ce document qui est présenté lors des contrôles sanitaires), ainsi que le diplôme de votre établissement, à afficher si vous le souhaitez.`,
    metadata: [
      ['Parcours', p.formation?.intitule || p.numero || 'POEI'],
      ['Module', `${INTITULE_MODULE_HYGIENE} (${heures} h)`],
      ['Personnel formé', noms],
      ['Dates', `Du ${fr(p.date_debut)} au ${fr(p.date_fin || p.date_debut)}`],
    ] as [string, string][],
    footerNote: `2 pièces jointes : ${fichierAttestations} (une page par collaborateur) et ${fichierDiplome}.`,
    pdfFilename: fichierAttestations,
  }

  // Déjà envoyé ? On prévient sans bloquer : un renvoi peut être voulu.
  const { data: deja } = await supabase.from('email_logs')
    .select('sent_at').eq('organization_id', orgId).eq('entity_type', 'poei').eq('entity_id', poeiId)
    .eq('template', 'hygiene_poei').eq('status', 'sent').order('sent_at', { ascending: false }).limit(1).maybeSingle()

  if (opts.preview) {
    return {
      success: true,
      data: {
        referent: { nom: referent.nom, email: referent.email },
        apercus: [{
          candidatId: 'referent', nom: referent.nom || etablissement, to: referent.email,
          subject: params.subject,
          html: buildDocumentEmailHtml({ ...enveloppe, ...params }),
          pieceJointe: `${fichierAttestations} + ${fichierDiplome}`,
          avertissement: deja?.sent_at ? `Déjà envoyé le ${fr(deja.sent_at)} : confirmer renverra les documents.` : undefined,
        }],
      },
    }
  }

  // ── Génération des documents ──
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { createElement } = await import('react')
  const { AttestationHygienePDF } = await import('@/lib/pdf/attestation-hygiene-pdf')
  const { DiplomeEtablissementPDF } = await import('@/lib/pdf/diplome-etablissement-pdf')
  const heuresParApprenant: Record<string, number> = {}
  for (const a of apprenants) heuresParApprenant[a.id] = heures

  let attestations: Buffer, diplome: Buffer
  try {
    attestations = Buffer.from(await renderToBuffer(createElement(AttestationHygienePDF, {
      apprenants,
      session: { reference: p.numero, date_debut: p.date_debut, date_fin: p.date_fin },
      formation: { intitule: INTITULE_MODULE_HYGIENE, duree_heures: heures },
      org, heuresParApprenant,
    }) as any))
    diplome = Buffer.from(await renderToBuffer(createElement(DiplomeEtablissementPDF, {
      org,
      etablissement: p.client?.nom_commercial || p.client?.raison_sociale || 'Établissement',
      ville: p.client?.ville || null,
      formationIntitule: INTITULE_MODULE_HYGIENE,
      dateDebut: p.date_debut, dateFin: p.date_fin,
      stagiaires: apprenants,
      formateurNom,
    }) as any))
  } catch (e) {
    console.error('[hygiène POEI]', e)
    return { success: false, error: 'Erreur de génération des documents' }
  }

  const result = await sendDocumentEmail({
    to: referent.email,
    ...enveloppe,
    ...params,
    pdfBuffer: attestations,
    extraAttachments: [{ filename: fichierDiplome, content: diplome, contentType: 'application/pdf' }],
  })
  await supabase.from('email_logs').insert({
    organization_id: orgId, to_email: referent.email, to_name: referent.nom || null,
    subject: params.subject, template: 'hygiene_poei',
    entity_type: 'poei', entity_id: poeiId,
    status: result.success ? 'sent' : 'failed', error: result.success ? null : (result.error || null),
    sent_at: result.success ? new Date().toISOString() : null, triggered_by: session.user.id,
  })
  if (!result.success) return { success: false, error: result.error || "L'envoi a échoué" }

  await logAudit({ action: 'send_hygiene_poei', entity_type: 'poei', entity_id: poeiId, details: { referent: referent.email, candidats: apprenants.length, heures } })
  revalidatePath(`/dashboard/poei/${poeiId}`)
  return { success: true, data: { referent: { nom: referent.nom, email: referent.email } } }
}
