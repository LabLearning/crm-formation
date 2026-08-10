'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { CONDITIONS_PAIEMENT_DEFAUT, DELAI_PAIEMENT_JOURS } from '@/lib/facturation'
import type { ActionResult } from '@/lib/types'

const ROLES = ['super_admin', 'gestionnaire', 'directeur_commercial']

/** Marqueur qui rend la génération idempotente et retrouvable. */
const marqueur = (sessionId: string) => `[SESSION-FACT:${sessionId}]`

/**
 * Génère la facture OPCO d'une session, sur le modèle des factures Dendreo :
 * une facture par session, adressée à l'OPCO, « pour le compte de »
 * l'entreprise, avec une ligne unique « Formation ».
 *
 * Refuse si la session a déjà été facturée ailleurs (montant repris de
 * Dendreo) : c'est le cas de 158 sessions 2026, qu'il ne faut pas refacturer.
 */
export async function genererFactureOpcoAction(
  sessionId: string,
  options?: { montantHt?: number; forcer?: boolean },
): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const { data: s } = await supabase
    .from('sessions')
    .select(`
      id, reference, intitule, type_session, date_debut, date_fin, lieu, adresse, code_postal, ville,
      prix_ht, opco_id, numero_dossier_opco, montant_finance_opco, deja_facture_ailleurs,
      formation:formation_id(intitule, duree_heures),
      client:client_id(id, raison_sociale, opco_id, adresse, code_postal, ville, siret)
    `)
    .eq('id', sessionId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!s) return { success: false, error: 'Session introuvable' }

  // Déjà facturée : dans Dendreo, ou déjà ici.
  const dejaAilleurs = Number((s as any).deja_facture_ailleurs || 0)
  if (dejaAilleurs > 0 && !options?.forcer) {
    return {
      success: false,
      error: `Cette session a déjà été facturée pour ${dejaAilleurs.toLocaleString('fr-FR')} € (reprise de Dendreo). Générer une facture ici ferait double emploi.`,
    }
  }

  const { data: existante } = await supabase
    .from('factures')
    .select('id, numero, status')
    .eq('organization_id', orgId)
    .ilike('notes_internes', `%${marqueur(sessionId)}%`)
    .maybeSingle()
  if (existante) {
    return { success: false, error: `La facture ${(existante as any).numero} existe déjà pour cette session.` }
  }

  const opcoId = (s as any).opco_id || (s as any).client?.opco_id
  if (!opcoId) {
    return { success: false, error: "Aucun OPCO rattaché : renseignez-le sur la session ou sur la fiche client." }
  }

  const montantHt = Number(
    options?.montantHt ?? (s as any).montant_finance_opco ?? (s as any).prix_ht ?? 0,
  )
  if (!(montantHt > 0)) {
    return { success: false, error: 'Montant à facturer inconnu : renseignez le prix de la session.' }
  }

  const today = new Date().toISOString().slice(0, 10)
  const echeance = new Date()
  echeance.setDate(echeance.getDate() + DELAI_PAIEMENT_JOURS)

  const intitule = (s as any).formation?.intitule || (s as any).intitule || 'Formation'

  const { data: facture, error } = await supabase
    .from('factures')
    .insert({
      organization_id: orgId,
      type: 'facture',
      client_id: (s as any).client?.id || null,
      session_id: sessionId,
      objet: `Formation « ${intitule} »`,
      status: 'brouillon',
      date_emission: today,
      date_echeance: echeance.toISOString().slice(0, 10),
      taux_tva: 0,
      financeur_type: 'opco',
      numero_prise_en_charge: (s as any).numero_dossier_opco || null,
      subrogation: true,
      conditions_paiement: CONDITIONS_PAIEMENT_DEFAUT,
      montant_ht: montantHt,
      montant_tva: 0,
      montant_ttc: montantHt,
      montant_restant: montantHt,
      notes_internes: `Facture OPCO de la session ${(s as any).reference || ''}. ${marqueur(sessionId)}`,
      created_by: session.user.id,
    })
    .select('id, numero')
    .single()

  if (error || !facture) {
    console.error('[facture opco]', error)
    if ((error as any)?.code === '42703') {
      return { success: false, error: 'Colonnes absentes : appliquer la migration 122_facturation_opco.sql' }
    }
    return { success: false, error: 'Création de la facture impossible' }
  }

  // Ligne unique « Formation », comme sur les factures OPCO existantes.
  await supabase.from('facture_lignes').insert({
    facture_id: facture.id,
    designation: 'Formation',
    quantite: 1,
    unite: 'forfait',
    prix_unitaire_ht: montantHt,
    montant_ht: montantHt,
    position: 0,
  })

  await logAudit({ action: 'create', entity_type: 'facture', entity_id: facture.id, details: { session: sessionId, opco: opcoId } })
  revalidatePath(`/dashboard/sessions/${sessionId}`)
  revalidatePath('/dashboard/factures')
  return { success: true, data: facture }
}
