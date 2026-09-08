'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'
import { buildDocumentEmailHtml } from '@/lib/email'
import {
  contexteMailPoei, enveloppeOrg, nomComplet,
  paramsAttestationEntree, paramsMessageLibre, paramsCertificatSignature,
  ensureCertificatSignature, urlSignatureCertificat,
} from '@/lib/poei-emails'

export interface ApercuMail {
  candidatId: string
  nom: string
  to: string
  subject: string
  html: string
  pieceJointe?: string
  avertissement?: string
}

/**
 * Aperçu de chaque email AVANT envoi, candidat par candidat, construit avec
 * exactement les mêmes textes et le même gabarit que l'envoi réel.
 * Aucun email ne part ici ; seule la préparation du lien de signature (pour
 * le certificat) écrit en base, comme le fait déjà le bouton « Copier le lien ».
 */
export async function apercuEnvoiPoeiAction(
  poeiId: string,
  type: 'attestation' | 'certificat' | 'libre',
  candidatIds: string[],
  custom?: { subject?: string; message?: string },
): Promise<ActionResult & { data?: { apercus: ApercuMail[] } }> {
  const session = await getSession()
  if (['apprenant', 'formateur'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  if (!candidatIds.length) return { success: false, error: 'Aucun destinataire sélectionné' }
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const ctx = await contexteMailPoei(supabase, orgId, poeiId)
  if (!ctx) return { success: false, error: 'Projet POEI introuvable' }
  if (type === 'attestation' && !ctx.formation) return { success: false, error: 'Aucune formation liée au projet' }
  if (type === 'libre' && (!custom?.subject?.trim() || !custom?.message?.trim())) {
    return { success: false, error: 'Sujet et message sont requis' }
  }

  const { data: candidats } = await supabase
    .from('poei_candidats')
    .select('id, identifiant_ft, poste_vise, apprenant:apprenants(id, civilite, prenom, nom, email, entreprise, date_naissance)')
    .in('id', candidatIds)
    .eq('organization_id', orgId)

  const enveloppe = enveloppeOrg(ctx.org, ctx.orgRaw)
  const apercus: ApercuMail[] = []

  for (const c of candidats || []) {
    const a: any = c.apprenant
    if (!a?.email) continue

    if (type === 'attestation') {
      const { logSubject, ...params } = paramsAttestationEntree(ctx, a, custom)
      apercus.push({
        candidatId: c.id, nom: nomComplet(a), to: a.email, subject: params.subject,
        html: buildDocumentEmailHtml({ ...enveloppe, ...params }),
        pieceJointe: params.pdfFilename,
      })
    } else if (type === 'libre') {
      const params = paramsMessageLibre(ctx, a, { subject: custom!.subject!, message: custom!.message! })
      apercus.push({
        candidatId: c.id, nom: nomComplet(a), to: a.email, subject: params.subject,
        html: buildDocumentEmailHtml({ ...enveloppe, ...params }),
        pieceJointe: params.pdfFilename,
      })
    } else {
      const r = await ensureCertificatSignature(supabase, orgId, poeiId, a.id, session.user.id)
      if ('error' in r) {
        apercus.push({ candidatId: c.id, nom: nomComplet(a), to: a.email, subject: '', html: '', avertissement: r.error })
        continue
      }
      const { sig } = r as any
      const params = paramsCertificatSignature(a, urlSignatureCertificat(sig.token))
      apercus.push({
        candidatId: c.id, nom: nomComplet(a), to: a.email, subject: params.subject,
        html: buildDocumentEmailHtml({ ...enveloppe, ...params }),
        avertissement: sig.signed_at ? 'Certificat déjà signé : cet envoi sera ignoré.' : undefined,
      })
    }
  }

  if (!apercus.length) return { success: false, error: 'Aucun destinataire avec adresse e-mail' }
  return { success: true, data: { apercus } }
}
