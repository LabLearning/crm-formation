import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Actions de l'assistant CRM : l'IA les PROPOSE, l'utilisateur les CONFIRME
 * dans l'interface avant toute exécution. Jamais d'exécution directe par le
 * modèle — le boulevard entre « proposer » et « faire » passe par un clic humain.
 */

export interface PropositionAction {
  id: string
  type: string
  params: Record<string, any>
  libelle: string
}

/** Déclarations d'outils « action » exposées au modèle (proposition seulement). */
export const OUTILS_ACTIONS = [
  {
    name: 'action_envoyer_convocation',
    description: "PROPOSE l'envoi de la convocation de formation au référent du client de la session (email brandé avec le PDF). L'utilisateur devra confirmer dans l'interface avant l'envoi réel.",
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'UUID de la session' },
        libelle: { type: 'string', description: 'Résumé humain de l’action, ex. « Envoyer la convocation de la session Hygiène du 12 mars à Boucherie les halles »' },
      },
      required: ['session_id', 'libelle'],
    },
  },
  {
    name: 'action_envoyer_convention',
    description: "PROPOSE l'envoi de la convention de formation en signature électronique au client. Pour une session inter multi-entreprises, précise client_id (la convention couvre les stagiaires de cette entreprise). Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'UUID de la session' },
        client_id: { type: 'string', description: 'UUID du client (sessions inter uniquement)' },
        libelle: { type: 'string', description: 'Résumé humain de l’action' },
      },
      required: ['session_id', 'libelle'],
    },
  },
  {
    name: 'action_relancer_facture',
    description: "PROPOSE une relance par email de la facture impayée au client (email brandé avec la facture PDF jointe, relance_count incrémenté). Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        facture_id: { type: 'string', description: 'UUID de la facture' },
        libelle: { type: 'string', description: 'Résumé humain, ex. « Relancer la facture FA-2026-012 (1 250 € dus) de Chamas Tacos »' },
      },
      required: ['facture_id', 'libelle'],
    },
  },
  {
    name: 'action_envoyer_lien_emargement',
    description: "PROPOSE l'envoi (ou la génération) du lien personnel de signature d'émargement d'un stagiaire : il y signe ses journées de présence depuis son téléphone. Si le stagiaire n'a pas d'email en fiche, le lien à copier est fourni. Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'UUID de la session' },
        apprenant_id: { type: 'string', description: 'UUID du stagiaire' },
        libelle: { type: 'string', description: 'Résumé humain, ex. « Envoyer son lien de signature à Sophiane Benouar (session hygiène du 8 juin) »' },
      },
      required: ['session_id', 'apprenant_id', 'libelle'],
    },
  },
  {
    name: 'action_marquer_paiement',
    description: "PROPOSE l'enregistrement d'un paiement reçu sur une facture (virement, chèque…) : crée le règlement, met à jour le restant dû et passe la facture en payée si elle est soldée. Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        facture_id: { type: 'string', description: 'UUID de la facture' },
        montant: { type: 'number', description: 'Montant reçu en euros (défaut : le restant dû)' },
        mode: { type: 'string', enum: ['virement', 'cheque', 'cb', 'especes'], description: 'Mode de paiement' },
        reference: { type: 'string', description: 'Référence (n° de chèque, libellé de virement…)' },
        date_paiement: { type: 'string', description: 'Date AAAA-MM-JJ (défaut : aujourd’hui)' },
        libelle: { type: 'string', description: 'Résumé humain, ex. « Enregistrer le virement de 1 176 € reçu sur FA-2026-0215 (Les Jardins de Belleville) »' },
      },
      required: ['facture_id', 'mode', 'libelle'],
    },
  },
] as const

export const NOMS_ACTIONS = new Set<string>(OUTILS_ACTIONS.map((o) => o.name))

/** Relance email d'UNE facture — même recette que le cron relances-factures. */
async function relancerFacture(factureId: string, orgId: string): Promise<{ success: boolean; message: string }> {
  const supabase = await createServiceRoleClient()
  const { data: f } = await supabase.from('factures')
    .select('id, numero, status, montant_restant, montant_ttc, date_echeance, relance_count, client:clients(raison_sociale, nom_commercial, email)')
    .eq('id', factureId).eq('organization_id', orgId).maybeSingle()
  if (!f) return { success: false, message: 'Facture introuvable' }
  const cli: any = (f as any).client
  if (!cli?.email) return { success: false, message: 'Le client n’a pas d’adresse email' }
  if (Number(f.montant_restant ?? f.montant_ttc ?? 0) <= 0) return { success: false, message: 'Cette facture est soldée, rien à relancer' }

  const montant = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(f.montant_restant || f.montant_ttc || 0))
  const echeance = f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'échue'

  const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single()
  const { data: factureFull } = await supabase.from('factures')
    .select('*, client:clients(*), formation:formations(intitule), lignes:facture_lignes(*), paiements(*)')
    .eq('id', f.id).single()
  if (!factureFull) return { success: false, message: 'Facture illisible' }

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { createElement } = await import('react')
  const { FacturePDF } = await import('@/lib/pdf/facture-pdf')
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const { sendDocumentEmail } = await import('@/lib/email')
  const orgDoc = await withDocumentLogo(supabase, org)
  const buffer = await renderToBuffer(createElement(FacturePDF, { facture: factureFull as any, org: orgDoc }) as any)
  const relanceNum = (f.relance_count || 0) + 1

  const r = await sendDocumentEmail({
    to: cli.email,
    orgName: (org as any)?.name || 'Lab Learning',
    orgEmail: (org as any)?.email_contact || (org as any)?.email,
    orgLogoUrl: (org as any)?.logo_url,
    qualiopiCertified: (org as any)?.is_qualiopi !== false,
    recipientName: cli.nom_commercial || cli.raison_sociale || 'Madame, Monsieur',
    subject: `Relance : facture ${f.numero} échue (${montant})`,
    docTitle: `Relance n°${relanceNum} : facture ${f.numero}`,
    intro: `Sauf erreur de notre part, votre facture est arrivée à échéance et reste impayée à ce jour. Vous trouverez ci-joint la facture concernée.`,
    metadata: [['Montant dû', montant], ['Échéance', echeance], ['Référence', f.numero || '']],
    pdfBuffer: Buffer.from(buffer),
    pdfFilename: `facture-${f.numero}.pdf`,
    footerNote: 'Merci de procéder au règlement dans les meilleurs délais. Si vous avez déjà réglé, ignorez ce message.',
    organizationId: orgId,
    entityType: 'facture',
    entityId: f.id,
  } as any)
  if (!(r as any)?.success) return { success: false, message: (r as any)?.error || 'Envoi impossible' }

  await supabase.from('factures')
    .update({ status: 'en_retard', relance_count: relanceNum, derniere_relance_at: new Date().toISOString() })
    .eq('id', f.id)
  return { success: true, message: `Relance n°${relanceNum} envoyée à ${cli.email} (${montant} dus)` }
}

/**
 * Exécute une action APRÈS confirmation de l'utilisateur. Les actions session
 * réutilisent les server actions existantes (elles portent leurs propres
 * contrôles d'accès et écrivent l'historique d'envoi).
 */
export async function executerAction(type: string, params: any, orgId: string, userId?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (type === 'action_envoyer_convocation') {
      const { sendConvocationToReferentAction } = await import('@/app/dashboard/sessions/[id]/actions')
      const r = await sendConvocationToReferentAction(String(params.session_id))
      return r.success
        ? { success: true, message: `Convocation envoyée${(r as any).data?.email ? ` à ${(r as any).data.email}` : ''}` }
        : { success: false, message: r.error || 'Envoi impossible' }
    }
    if (type === 'action_envoyer_convention') {
      if (params.client_id) {
        const { envoyerConventionEntrepriseInterAction } = await import('@/app/dashboard/sessions/[id]/actions')
        const r = await envoyerConventionEntrepriseInterAction(String(params.session_id), String(params.client_id))
        return r.success ? { success: true, message: 'Convention envoyée en signature' } : { success: false, message: r.error || 'Envoi impossible' }
      }
      const { sendConventionForSignatureAction } = await import('@/app/dashboard/sessions/[id]/actions')
      const r = await sendConventionForSignatureAction(String(params.session_id))
      return r.success
        ? { success: true, message: `Convention envoyée en signature${(r as any).data?.email ? ` à ${(r as any).data.email}` : ''}` }
        : { success: false, message: r.error || 'Envoi impossible' }
    }
    if (type === 'action_relancer_facture') {
      return await relancerFacture(String(params.facture_id), orgId)
    }
    if (type === 'action_envoyer_lien_emargement') {
      const supabase = await createServiceRoleClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'
      const { data: a } = await supabase.from('apprenants').select('id, prenom, nom, email')
        .eq('id', String(params.apprenant_id)).eq('organization_id', orgId).maybeSingle()
      if (!a) return { success: false, message: 'Stagiaire introuvable' }
      // Token portail : réutilisé ou créé
      const { data: ex } = await supabase.from('portal_access_tokens').select('token')
        .eq('organization_id', orgId).eq('type', 'apprenant').eq('apprenant_id', a.id).eq('is_active', true)
        .limit(1).maybeSingle()
      let token = ex?.token
      if (!token) {
        const { data: cree, error } = await supabase.from('portal_access_tokens')
          .insert({ organization_id: orgId, type: 'apprenant', apprenant_id: a.id, email: a.email, created_by: userId || null })
          .select('token').single()
        if (error) return { success: false, message: 'Génération du lien impossible' }
        token = cree.token
      }
      const url = `${appUrl}/portail/${token}/mes-emargements`
      if (!a.email) return { success: false, message: `${a.prenom} ${a.nom} n'a pas d'email en fiche. Lien à copier : ${url}` }
      const { envoyerLienEmargementAction } = await import('@/app/dashboard/sessions/[id]/actions')
      const r = await envoyerLienEmargementAction(String(params.session_id), a.id)
      return r.success
        ? { success: true, message: `Lien de signature envoyé à ${a.email}` }
        : { success: false, message: r.error || 'Envoi impossible' }
    }
    if (type === 'action_marquer_paiement') {
      const supabase = await createServiceRoleClient()
      const { data: f } = await supabase.from('factures')
        .select('id, numero, montant_ttc, montant_paye, montant_restant, client:clients(raison_sociale, nom_commercial)')
        .eq('id', String(params.facture_id)).eq('organization_id', orgId).maybeSingle()
      if (!f) return { success: false, message: 'Facture introuvable' }
      const restant = Number(f.montant_restant ?? f.montant_ttc ?? 0)
      const montant = Number(params.montant || restant)
      if (!montant || montant <= 0) return { success: false, message: 'Montant invalide' }
      const datePaiement = params.date_paiement || new Date().toISOString().slice(0, 10)
      const cli: any = (f as any).client
      const { error: eP } = await supabase.from('paiements').insert({
        organization_id: orgId, facture_id: f.id, montant, mode: String(params.mode), status: 'valide',
        date_paiement: datePaiement, reference: params.reference || null,
        payeur_nom: cli?.nom_commercial || cli?.raison_sociale || null, payeur_type: 'client',
        created_by: userId || null, notes: 'Enregistré via Starkk (confirmé par l’utilisateur).',
      })
      if (eP) return { success: false, message: eP.message }
      const paye = Number(f.montant_paye || 0) + montant
      const nouveauRestant = Math.max(0, Number(f.montant_ttc || 0) - paye)
      const solde = nouveauRestant <= 0
      await supabase.from('factures').update({
        montant_paye: paye, montant_restant: nouveauRestant,
        status: solde ? 'payee' : 'payee_partiellement',
        date_paiement_complet: solde ? datePaiement : null,
      }).eq('id', f.id)
      return { success: true, message: solde
        ? `Paiement de ${montant.toLocaleString('fr-FR')} € enregistré : la facture ${f.numero} est soldée (acquittée)`
        : `Paiement de ${montant.toLocaleString('fr-FR')} € enregistré : reste ${nouveauRestant.toLocaleString('fr-FR')} € sur ${f.numero}` }
    }
    return { success: false, message: `Action inconnue : ${type}` }
  } catch (e: any) {
    console.error('[assistant action]', e)
    return { success: false, message: e?.message || 'Erreur pendant l’exécution' }
  }
}
