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
  {
    name: 'action_modifier_client',
    description: "PROPOSE la mise à jour d'une fiche client : email, téléphone, adresse, code postal, ville, type de financeur (entreprise/opco/agefice/france_travail). Sert notamment à compléter un référent manquant. Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID du client' },
        champs: { type: 'object', description: 'Champs à modifier parmi : email, telephone, adresse, code_postal, ville, financeur_type' },
        libelle: { type: 'string', description: 'Résumé humain, ex. « Ajouter l’email referent@x.fr à la fiche CS59 »' },
      },
      required: ['client_id', 'champs', 'libelle'],
    },
  },
  {
    name: 'action_modifier_apprenant',
    description: "PROPOSE la mise à jour d'une fiche apprenant : email et/ou téléphone (nécessaires pour les liens de signature). Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        apprenant_id: { type: 'string', description: 'UUID de l’apprenant' },
        champs: { type: 'object', description: 'Champs à modifier parmi : email, telephone' },
        libelle: { type: 'string', description: 'Résumé humain' },
      },
      required: ['apprenant_id', 'champs', 'libelle'],
    },
  },
  {
    name: 'action_creer_client',
    description: "PROPOSE la création d'une fiche client (entreprise ou particulier). Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        raison_sociale: { type: 'string' },
        type: { type: 'string', enum: ['entreprise', 'particulier'], description: 'Défaut : entreprise' },
        email: { type: 'string' }, telephone: { type: 'string' }, ville: { type: 'string' },
        financeur_type: { type: 'string', enum: ['entreprise', 'opco', 'agefice', 'france_travail'] },
        libelle: { type: 'string', description: 'Résumé humain' },
      },
      required: ['raison_sociale', 'libelle'],
    },
  },
  {
    name: 'action_creer_apprenant',
    description: "PROPOSE la création d'un apprenant rattaché à un client. Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID du client de rattachement' },
        prenom: { type: 'string' }, nom: { type: 'string' },
        email: { type: 'string' }, telephone: { type: 'string' },
        libelle: { type: 'string', description: 'Résumé humain' },
      },
      required: ['client_id', 'prenom', 'nom', 'libelle'],
    },
  },
  {
    name: 'action_inscrire_apprenant',
    description: "PROPOSE l'inscription d'un apprenant existant à une session (crée aussi ses émargements sur la grille de la session). Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }, apprenant_id: { type: 'string' },
        libelle: { type: 'string', description: 'Résumé humain' },
      },
      required: ['session_id', 'apprenant_id', 'libelle'],
    },
  },
  {
    name: 'action_poser_presence',
    description: "PROPOSE de pointer la présence (ou l'absence motivée) d'un stagiaire sur une session : tous ses créneaux, ou seulement une date. Ne touche JAMAIS un créneau déjà signé ou une feuille validée. Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }, apprenant_id: { type: 'string' },
        present: { type: 'boolean', description: 'true = présent, false = absent' },
        motif: { type: 'string', description: 'Motif d’absence (si absent)' },
        date: { type: 'string', description: 'AAAA-MM-JJ pour ne pointer qu’un jour (défaut : toute la session)' },
        libelle: { type: 'string', description: 'Résumé humain' },
      },
      required: ['session_id', 'apprenant_id', 'present', 'libelle'],
    },
  },
  {
    name: 'action_changer_statut_session',
    description: "PROPOSE le changement de statut d'une session (planifiee, confirmee, en_cours, terminee, annulee). Le passage en terminée déclenche les automatismes de clôture (attestations d'hygiène au client si applicable). Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        statut: { type: 'string', enum: ['planifiee', 'confirmee', 'en_cours', 'terminee', 'annulee'] },
        libelle: { type: 'string', description: 'Résumé humain' },
      },
      required: ['session_id', 'statut', 'libelle'],
    },
  },
  {
    name: 'action_envoyer_attestations_hygiene',
    description: "PROPOSE l'envoi des attestations d'hygiène + diplôme d'établissement au référent client d'UNE session terminée. Protégé : jamais d'attestation à 0 heure, jamais de doublon. Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        libelle: { type: 'string', description: 'Résumé humain, ex. « Envoyer les attestations d’hygiène de la session Boucherie les halles au référent »' },
      },
      required: ['session_id', 'libelle'],
    },
  },
  {
    name: 'action_maj_reglement_agefice',
    description: "PROPOSE l'enregistrement du règlement d'un dossier AGEFICE (mode, n° de chèque/virement, date) : le dossier passe en phase remboursement et la facture liée peut être acquittée via action_marquer_paiement. Confirmation utilisateur requise.",
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: { type: 'string', description: 'UUID du dossier AGEFICE' },
        mode: { type: 'string', enum: ['virement', 'cheque'] },
        reference: { type: 'string', description: 'N° de chèque ou de virement' },
        date: { type: 'string', description: 'Date du règlement AAAA-MM-JJ' },
        libelle: { type: 'string', description: 'Résumé humain' },
      },
      required: ['dossier_id', 'mode', 'libelle'],
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
    if (type === 'action_modifier_client') {
      const supabase = await createServiceRoleClient()
      const autorises = ['email', 'telephone', 'adresse', 'code_postal', 'ville', 'financeur_type']
      const champs: any = {}
      for (const [k, v] of Object.entries(params.champs || {})) if (autorises.includes(k)) champs[k] = v
      if (!Object.keys(champs).length) return { success: false, message: 'Aucun champ modifiable fourni' }
      const { data, error } = await supabase.from('clients').update(champs)
        .eq('id', String(params.client_id)).eq('organization_id', orgId).select('raison_sociale, nom_commercial').maybeSingle()
      if (error || !data) return { success: false, message: error?.message || 'Client introuvable' }
      return { success: true, message: `Fiche ${data.nom_commercial || data.raison_sociale} mise à jour (${Object.keys(champs).join(', ')})` }
    }
    if (type === 'action_modifier_apprenant') {
      const supabase = await createServiceRoleClient()
      const autorises = ['email', 'telephone']
      const champs: any = {}
      for (const [k, v] of Object.entries(params.champs || {})) if (autorises.includes(k)) champs[k] = v
      if (!Object.keys(champs).length) return { success: false, message: 'Aucun champ modifiable fourni' }
      const { data, error } = await supabase.from('apprenants').update(champs)
        .eq('id', String(params.apprenant_id)).eq('organization_id', orgId).select('prenom, nom').maybeSingle()
      if (error || !data) return { success: false, message: error?.message || 'Apprenant introuvable' }
      return { success: true, message: `Fiche ${data.prenom} ${data.nom} mise à jour (${Object.keys(champs).join(', ')})` }
    }
    if (type === 'action_creer_client') {
      const supabase = await createServiceRoleClient()
      const { data, error } = await supabase.from('clients').insert({
        organization_id: orgId,
        raison_sociale: String(params.raison_sociale),
        type: params.type === 'particulier' ? 'particulier' : 'entreprise',
        email: params.email || null, telephone: params.telephone || null, ville: params.ville || null,
        financeur_type: params.financeur_type || 'entreprise',
      }).select('id').single()
      if (error) return { success: false, message: error.message }
      return { success: true, message: `Client « ${params.raison_sociale} » créé : /dashboard/clients/${data.id}` }
    }
    if (type === 'action_creer_apprenant') {
      const supabase = await createServiceRoleClient()
      const { data: cli } = await supabase.from('clients').select('id').eq('id', String(params.client_id)).eq('organization_id', orgId).maybeSingle()
      if (!cli) return { success: false, message: 'Client de rattachement introuvable' }
      const { data, error } = await supabase.from('apprenants').insert({
        organization_id: orgId, client_id: cli.id,
        prenom: String(params.prenom), nom: String(params.nom),
        email: params.email || null, telephone: params.telephone || null,
      }).select('id').single()
      if (error) return { success: false, message: error.message }
      return { success: true, message: `Apprenant ${params.prenom} ${params.nom} créé : /dashboard/apprenants/${data.id}` }
    }
    if (type === 'action_inscrire_apprenant') {
      const supabase = await createServiceRoleClient()
      const { data: sess } = await supabase.from('sessions').select('id').eq('id', String(params.session_id)).eq('organization_id', orgId).maybeSingle()
      if (!sess) return { success: false, message: 'Session introuvable' }
      const { data: deja } = await supabase.from('inscriptions').select('id').eq('session_id', sess.id).eq('apprenant_id', String(params.apprenant_id)).maybeSingle()
      if (deja) return { success: false, message: 'Cet apprenant est déjà inscrit à la session' }
      const { error } = await supabase.from('inscriptions').insert({ session_id: sess.id, apprenant_id: String(params.apprenant_id), status: 'inscrit' })
      if (error) return { success: false, message: error.message }
      // Grille d'émargement clonée depuis un autre inscrit de la session
      const { data: modele } = await supabase.from('emargements')
        .select('date, creneau, heure_debut, heure_fin, apprenant_id').eq('session_id', sess.id).limit(200)
      const parApprenant = new Map<string, any[]>()
      for (const m of modele || []) {
        if (!parApprenant.has(m.apprenant_id)) parApprenant.set(m.apprenant_id, [])
        parApprenant.get(m.apprenant_id)!.push(m)
      }
      const grille = [...parApprenant.values()].sort((a, b) => b.length - a.length)[0]
      if (grille?.length) {
        await supabase.from('emargements').insert(grille.map((m: any) => ({
          organization_id: orgId, session_id: sess.id, apprenant_id: String(params.apprenant_id),
          date: m.date, creneau: m.creneau, heure_debut: m.heure_debut, heure_fin: m.heure_fin,
        })))
      }
      return { success: true, message: `Inscription faite${grille?.length ? ` (+ ${grille.length} créneaux d'émargement)` : ''}` }
    }
    if (type === 'action_poser_presence') {
      const supabase = await createServiceRoleClient()
      let q = supabase.from('emargements')
        .update(params.present
          ? { est_present: true, motif_absence: null }
          : { est_present: false, motif_absence: params.motif || null })
        .eq('organization_id', orgId).eq('session_id', String(params.session_id)).eq('apprenant_id', String(params.apprenant_id))
        .is('signature_data', null).is('validated_by', null)
      if (params.date) q = q.eq('date', String(params.date))
      const { data, error } = await q.select('id')
      if (error) return { success: false, message: error.message }
      if (!data?.length) return { success: false, message: 'Aucun créneau modifiable (déjà signés/validés, ou introuvables)' }
      return { success: true, message: `${data.length} créneau${data.length > 1 ? 'x' : ''} pointé${data.length > 1 ? 's' : ''} ${params.present ? 'présent' : 'absent'}` }
    }
    if (type === 'action_changer_statut_session') {
      const { updateSessionStatusAction } = await import('@/app/dashboard/sessions/[id]/actions')
      const r = await updateSessionStatusAction(String(params.session_id), String(params.statut))
      return r.success
        ? { success: true, message: `Session passée en « ${params.statut} »${params.statut === 'terminee' ? ' (automatismes de clôture déclenchés)' : ''}` }
        : { success: false, message: r.error || 'Changement impossible' }
    }
    if (type === 'action_envoyer_attestations_hygiene') {
      const supabase = await createServiceRoleClient()
      const { apercuHygiene, envoyerHygieneAutomatique } = await import('@/lib/hygiene-auto')
      const apercu = await apercuHygiene(supabase, String(params.session_id), orgId)
      if (!apercu.envoyable) return { success: false, message: `Envoi impossible : ${apercu.raison}` }
      await envoyerHygieneAutomatique(supabase, String(params.session_id), orgId)
      return { success: true, message: `Attestations envoyées à ${apercu.destinataire} (${apercu.stagiaires} stagiaire${(apercu.stagiaires || 0) > 1 ? 's' : ''}, ${apercu.heures})` }
    }
    if (type === 'action_maj_reglement_agefice') {
      const supabase = await createServiceRoleClient()
      const champs: any = {
        mode_reglement: String(params.mode),
        reference_reglement: params.reference || null,
        date_reglement: params.date || new Date().toISOString().slice(0, 10),
        statut: 'remboursement',
      }
      const { data, error } = await supabase.from('dossiers_agefice').update(champs)
        .eq('id', String(params.dossier_id)).eq('organization_id', orgId)
        .select('numero_dossier, apprenant:apprenant_id(prenom, nom)').maybeSingle()
      if (error || !data) return { success: false, message: error?.message || 'Dossier introuvable' }
      const a: any = (data as any).apprenant
      return { success: true, message: `Règlement ${params.mode}${params.reference ? ` n° ${params.reference}` : ''} enregistré sur le dossier ${data.numero_dossier || ''} de ${a?.prenom || ''} ${a?.nom || ''} — statut : remboursement demandé` }
    }
    return { success: false, message: `Action inconnue : ${type}` }
  } catch (e: any) {
    console.error('[assistant action]', e)
    return { success: false, message: e?.message || 'Erreur pendant l’exécution' }
  }
}
