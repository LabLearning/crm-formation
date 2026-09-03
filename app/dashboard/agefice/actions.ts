'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { estimationPriseEnCharge } from '@/lib/agefice'

/**
 * Dossiers AGEFICE : circuit de prise en charge des dirigeants non salariés.
 * La demande part TOUJOURS d'un Point d'Accueil (15 j à 4 mois avant le début),
 * le remboursement se joue dans les 4 mois après la fin.
 */

function nombre(v: FormDataEntryValue | null): number | null {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
function texte(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  return s || null
}

export async function creerDossierAgeficeAction(formData: FormData): Promise<{ success: boolean; error?: string; data?: { id: string } }> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const clientId = texte(formData.get('client_id'))
  if (!clientId) return { success: false, error: 'Choisissez le client (dirigeant)' }

  const dossier = {
    organization_id: session.organization.id,
    client_id: clientId,
    apprenant_id: texte(formData.get('apprenant_id')),
    formation_id: texte(formData.get('formation_id')),
    categorie: texte(formData.get('categorie')) || 'metier',
    modalite: texte(formData.get('modalite')) || 'presentiel',
    duree_heures: nombre(formData.get('duree_heures')),
    cout_pedagogique: nombre(formData.get('cout_pedagogique')),
    cfp_faible: formData.get('cfp_faible') === 'on',
    date_debut_formation: texte(formData.get('date_debut_formation')),
    date_fin_formation: texte(formData.get('date_fin_formation')),
    point_accueil: texte(formData.get('point_accueil')),
    notes: texte(formData.get('notes')),
    statut: 'a_constituer',
  }
  ;(dossier as any).montant_demande = estimationPriseEnCharge({
    modalite: dossier.modalite!, duree_heures: dossier.duree_heures,
    cout_pedagogique: dossier.cout_pedagogique, categorie: dossier.categorie!, cfp_faible: dossier.cfp_faible,
  })

  const { data, error } = await supabase.from('dossiers_agefice').insert(dossier).select('id').single()
  if (error) {
    console.error('[agefice]', error.message)
    if (/dossiers_agefice/.test(error.message)) return { success: false, error: 'Table absente — appliquez la migration 143 (SQL) puis réessayez' }
    return { success: false, error: 'Création impossible' }
  }
  revalidatePath('/dashboard/agefice')
  return { success: true, data: { id: data.id } }
}

export async function majDossierAgeficeAction(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const patch: Record<string, any> = { updated_at: new Date().toISOString() }
  const champsTexte = ['statut', 'categorie', 'modalite', 'point_accueil', 'point_accueil_email', 'numero_dossier', 'notes',
    'date_debut_formation', 'date_fin_formation', 'date_depot', 'date_accord', 'date_remboursement', 'apprenant_id', 'formation_id',
    'mode_reglement', 'reference_reglement', 'date_reglement']
  for (const c of champsTexte) if (formData.has(c)) patch[c] = texte(formData.get(c))
  const champsNombre = ['duree_heures', 'cout_pedagogique', 'montant_demande', 'montant_accorde', 'montant_rembourse']
  for (const c of champsNombre) if (formData.has(c)) patch[c] = nombre(formData.get(c))
  if (formData.has('cfp_faible_present')) patch.cfp_faible = formData.get('cfp_faible') === 'on'

  const { error } = await supabase.from('dossiers_agefice').update(patch)
    .eq('id', id).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Mise à jour impossible' }
  revalidatePath('/dashboard/agefice')
  return { success: true }
}

export async function cocherPieceAgeficeAction(id: string, piece: string, cochee: boolean): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('dossiers_agefice').select('pieces')
    .eq('id', id).eq('organization_id', session.organization.id).maybeSingle()
  if (!data) return { success: false, error: 'Dossier introuvable' }
  const pieces = { ...(data.pieces || {}), [piece]: cochee }
  const { error } = await supabase.from('dossiers_agefice').update({ pieces, updated_at: new Date().toISOString() })
    .eq('id', id).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Enregistrement impossible' }
  revalidatePath('/dashboard/agefice')
  return { success: true }
}

export async function supprimerDossierAgeficeAction(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('dossiers_agefice').delete()
    .eq('id', id).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Suppression impossible' }
  revalidatePath('/dashboard/agefice')
  return { success: true }
}

/**
 * Crée un dossier AGEFICE à partir d'une session EXISTANTE : reprend client,
 * dirigeant (1er inscrit), formation, dates. Pour basculer un client déjà
 * en base dans le circuit AGEFICE sans repasser par le wizard.
 */
export async function creerDossierDepuisSessionAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const { data: sess } = await supabase.from('sessions')
    .select('id, client_id, formation_id, date_debut, date_fin, formation:formation_id(duree_heures)')
    .eq('id', sessionId).eq('organization_id', orgId).maybeSingle()
  if (!sess) return { success: false, error: 'Session introuvable' }

  // Un dossier PAR dirigeant : on crée pour le premier inscrit qui n'en a pas
  const { data: existants } = await supabase.from('dossiers_agefice')
    .select('apprenant_id').eq('session_id', sessionId)
  const dejaServis = new Set((existants || []).map((d) => d.apprenant_id))
  const { data: tousInsc } = await supabase.from('inscriptions')
    .select('apprenant_id, apprenant:apprenants(client_id)').eq('session_id', sessionId)
    .not('status', 'in', '("annule","abandonne")').order('created_at')
  const insc = (tousInsc || []).filter((i: any) => i.apprenant_id && !dejaServis.has(i.apprenant_id))
  if (!insc.length) return { success: false, error: 'Chaque inscrit de la session a déjà son dossier AGEFICE' }

  const dureeH = (sess as any).formation?.duree_heures || null
  const { error } = await supabase.from('dossiers_agefice').insert({
    organization_id: orgId,
    client_id: sess.client_id || (insc[0] as any)?.apprenant?.client_id || null,
    apprenant_id: insc[0].apprenant_id,
    formation_id: sess.formation_id,
    session_id: sess.id,
    statut: 'a_constituer',
    duree_heures: dureeH,
    date_debut_formation: sess.date_debut,
    date_fin_formation: sess.date_fin,
    montant_demande: estimationPriseEnCharge({
      modalite: 'presentiel', duree_heures: dureeH, cout_pedagogique: null,
      categorie: 'metier', cfp_faible: false,
    }),
  })
  if (error) {
    console.error('[agefice session]', error.message)
    return { success: false, error: /dossiers_agefice/.test(error.message) ? 'Migration 143 à appliquer d\'abord' : 'Création impossible' }
  }
  if (sess.client_id) {
    // Marque le client AGEFICE (échoue en silence tant que l'enum n'est pas migré)
    await supabase.from('clients').update({ financeur_type: 'agefice' }).eq('id', sess.client_id)
  }
  revalidatePath('/dashboard/agefice')
  return { success: true }
}

/**
 * Facture AGEFICE : adressée au client (le dirigeant paie en direct, jamais
 * de subrogation). Montant = coût pédagogique du dossier, TVA selon le régime
 * de l'organisme. La facture est reliée au dossier (facture_id).
 */
export async function genererFactureAgeficeAction(dossierId: string): Promise<{ success: boolean; error?: string; data?: { factureId: string; numero?: string } }> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const { data: d } = await supabase.from('dossiers_agefice')
    .select('*, formation:formation_id(intitule), apprenant:apprenant_id(prenom, nom), session:session_id(reference, prix_ht)')
    .eq('id', dossierId).eq('organization_id', orgId).maybeSingle()
  if (!d) return { success: false, error: 'Dossier introuvable' }
  if (d.facture_id) {
    const { data: f } = await supabase.from('factures').select('id, numero').eq('id', d.facture_id).maybeSingle()
    if (f) return { success: true, data: { factureId: f.id, numero: (f as any).numero } }
  }

  const montantHt = Number(d.cout_pedagogique || (d as any).session?.prix_ht || d.montant_demande || 0)
  if (!(montantHt > 0)) return { success: false, error: 'Renseignez le coût pédagogique du dossier avant de facturer' }

  const intitule = (d as any).formation?.intitule || 'Formation'
  const stagiaire = (d as any).apprenant ? `${(d as any).apprenant.prenom || ''} ${(d as any).apprenant.nom || ''}`.trim() : ''
  const today = new Date().toISOString().slice(0, 10)
  const echeance = new Date(); echeance.setDate(echeance.getDate() + 30)

  const { data: facture, error } = await supabase.from('factures').insert({
    organization_id: orgId,
    type: 'facture',
    client_id: d.client_id,
    session_id: d.session_id,
    objet: `Formation « ${intitule} »${stagiaire ? ` — ${stagiaire}` : ''}`,
    status: 'brouillon',
    date_emission: today,
    date_echeance: echeance.toISOString().slice(0, 10),
    taux_tva: 0,
    subrogation: false,
    conditions_paiement: 'Paiement direct par le bénéficiaire (virement ou chèque) — financement AGEFICE, sans subrogation.',
    montant_ht: montantHt,
    montant_tva: 0,
    montant_ttc: montantHt,
    montant_restant: montantHt,
    notes_internes: `Facture AGEFICE du dossier ${d.numero_dossier || dossierId}.`,
    created_by: session.user.id,
  }).select('id, numero').single()
  if (error || !facture) {
    console.error('[facture agefice]', error?.message)
    return { success: false, error: 'Création de la facture impossible' }
  }

  await supabase.from('facture_lignes').insert({
    facture_id: facture.id,
    designation: `Formation « ${intitule} »${stagiaire ? ` — stagiaire : ${stagiaire}` : ''}`,
    quantite: 1,
    unite: 'forfait',
    prix_unitaire_ht: montantHt,
    montant_ht: montantHt,
    position: 0,
  })
  await supabase.from('dossiers_agefice').update({ facture_id: facture.id, updated_at: new Date().toISOString() }).eq('id', dossierId)

  revalidatePath('/dashboard/agefice')
  revalidatePath('/dashboard/factures')
  return { success: true, data: { factureId: facture.id, numero: (facture as any).numero } }
}


/**
 * Lien de signature de l'attestation d'assiduité : le dirigeant signe sur son
 * portail (/portail/{token}/attestations). Réutilise (ou crée) son token.
 */
export async function lienSignatureAttestationAction(dossierId: string): Promise<{ success: boolean; error?: string; data?: { url: string } }> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'

  const { data: dossier } = await supabase.from('dossiers_agefice')
    .select('id, apprenant_id, apprenant:apprenant_id(email)')
    .eq('id', dossierId).eq('organization_id', session.organization.id).maybeSingle()
  if (!dossier?.apprenant_id) return { success: false, error: 'Aucun dirigeant rattaché au dossier' }

  const { data: existant } = await supabase.from('portal_access_tokens')
    .select('token').eq('organization_id', session.organization.id)
    .eq('type', 'apprenant').eq('apprenant_id', dossier.apprenant_id).eq('is_active', true)
    .limit(1).maybeSingle()
  let token = existant?.token
  if (!token) {
    const { data: cree, error } = await supabase.from('portal_access_tokens')
      .insert({ organization_id: session.organization.id, type: 'apprenant', apprenant_id: dossier.apprenant_id, email: (dossier as any).apprenant?.email || null, created_by: session.user.id })
      .select('token').single()
    if (error) return { success: false, error: 'Génération du lien impossible' }
    token = cree.token
  }
  return { success: true, data: { url: `${appUrl}/portail/${token}/attestations` } }
}
