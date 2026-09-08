'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'
import { buildDocumentEmailHtml, sendDocumentEmail } from '@/lib/email'
import { enveloppeOrg } from '@/lib/poei-emails'
import { resoudreReferent, paramsEmailEvaluationFormateur, urlEvaluationFormateur } from '@/lib/evaluation-formateur-referent'
import type { ApercuMail } from './apercu-mail-actions'

/**
 * Envoie au référent de l'établissement un questionnaire d'évaluation PAR
 * formateur intervenu sur la POEI. En mode aperçu, rien ne part : on renvoie
 * chaque email tel qu'il partira (même gabarit, mêmes textes). La demande
 * (jeton) est créée ou réutilisée ; une évaluation déjà répondue est ignorée.
 */
export async function envoyerEvaluationsFormateursAction(
  poeiId: string,
  formateurIds: string[],
  opts?: { preview?: boolean },
): Promise<ActionResult & { data?: { apercus?: ApercuMail[]; sent?: number; skipped?: string[]; referent?: { nom: string; email: string } } }> {
  const session = await getSession()
  if (['apprenant', 'formateur'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  if (!formateurIds.length) return { success: false, error: 'Aucun formateur sélectionné' }
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const { data: poei } = await supabase
    .from('poei')
    .select('id, numero, date_debut, date_fin, client_id, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial)')
    .eq('id', poeiId).eq('organization_id', orgId).single()
  if (!poei) return { success: false, error: 'Projet POEI introuvable' }

  const referent = await resoudreReferent(supabase, (poei as any).client_id)
  if (!referent) return { success: false, error: "Aucun référent avec adresse email sur la fiche client : ajoutez un contact (référent formation, signataire ou principal)." }

  // Seuls les formateurs réellement intervenus sur la POEI
  const { data: interventions } = await supabase
    .from('poei_interventions').select('formateur_id').eq('poei_id', poeiId).not('formateur_id', 'is', null)
  const intervenants = new Set((interventions || []).map((i: any) => String(i.formateur_id)))
  const cibles = formateurIds.filter((id) => intervenants.has(id))
  if (!cibles.length) return { success: false, error: 'Ces formateurs ne sont pas rattachés à cette POEI' }

  const { data: formateurs } = await supabase
    .from('formateurs').select('id, prenom, nom').in('id', cibles).eq('organization_id', orgId)

  const { data: orgRaw } = await supabase.from('organizations').select('*').eq('id', orgId).single()
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)
  const enveloppe = enveloppeOrg(org, orgRaw)

  const fr = (x?: string | null) => (x ? new Date(x).toLocaleDateString('fr-FR') : '')
  const periode = (poei as any).date_debut ? `du ${fr((poei as any).date_debut)} au ${fr((poei as any).date_fin || (poei as any).date_debut)}` : null
  const etablissement = (poei as any).client?.nom_commercial || (poei as any).client?.raison_sociale || null

  const apercus: ApercuMail[] = []
  let sent = 0
  const skipped: string[] = []

  for (const f of formateurs || []) {
    const formateurNom = [f.prenom, f.nom].filter(Boolean).join(' ').trim() || 'Formateur'

    // Demande existante (jeton) ou nouvelle demande en attente
    const { data: existante } = await supabase
      .from('appreciations_parties_prenantes')
      .select('id, token, statut')
      .eq('organization_id', orgId).eq('type', 'evaluation_formateur')
      .eq('poei_id', poeiId).eq('formateur_id', f.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (existante?.statut === 'repondu') {
      if (opts?.preview) apercus.push({ candidatId: f.id, nom: formateurNom, to: referent.email, subject: '', html: '', avertissement: 'Le référent a déjà évalué ce formateur : aucun nouvel envoi.' })
      else skipped.push(`${formateurNom} (déjà évalué)`)
      continue
    }

    let demande = existante
    if (!demande) {
      const { data: creee, error } = await supabase.from('appreciations_parties_prenantes').insert({
        organization_id: orgId, type: 'evaluation_formateur', statut: 'envoye',
        poei_id: poeiId, client_id: (poei as any).client_id, formateur_id: f.id, contact_id: referent.id,
        repondant_nom: referent.nom, repondant_fonction: referent.fonction, repondant_email: referent.email,
      }).select('id, token, statut').single()
      if (error || !creee) {
        const msg = `${formateurNom} : préparation impossible (migration 146 appliquée ?)`
        if (opts?.preview) return { success: false, error: msg }
        skipped.push(msg); continue
      }
      demande = creee
    }

    const params = paramsEmailEvaluationFormateur({
      referentNom: referent.nom, formateurNom,
      formationIntitule: (poei as any).formation?.intitule || null,
      etablissement, periode, url: urlEvaluationFormateur(demande.token),
    })

    if (opts?.preview) {
      apercus.push({ candidatId: f.id, nom: formateurNom, to: referent.email, subject: params.subject, html: buildDocumentEmailHtml({ ...enveloppe, ...params }) })
      continue
    }

    const result = await sendDocumentEmail({ to: referent.email, ...enveloppe, ...params })
    await supabase.from('email_logs').insert({
      organization_id: orgId, to_email: referent.email, to_name: referent.nom || null,
      subject: params.subject, template: 'evaluation_formateur',
      entity_type: 'poei', entity_id: poeiId,
      status: result.success ? 'sent' : 'failed', error: result.success ? null : (result.error || null),
      sent_at: result.success ? new Date().toISOString() : null, triggered_by: session.user.id,
    })
    if (result.success) {
      sent++
      await supabase.from('appreciations_parties_prenantes').update({ sent_at: new Date().toISOString(), statut: 'envoye' }).eq('id', demande.id)
    } else skipped.push(formateurNom)
  }

  if (opts?.preview) {
    if (!apercus.length) return { success: false, error: 'Rien à prévisualiser' }
    return { success: true, data: { apercus, referent: { nom: referent.nom, email: referent.email } } }
  }

  await logAudit({ action: 'send_evaluation_formateur', entity_type: 'poei', entity_id: poeiId, details: { sent, skipped: skipped.length, referent: referent.email } })
  revalidatePath(`/dashboard/poei/${poeiId}`)
  return { success: sent > 0 || skipped.length === 0, data: { sent, skipped, referent: { nom: referent.nom, email: referent.email } }, error: sent === 0 && skipped.length ? skipped.join(', ') : undefined }
}
