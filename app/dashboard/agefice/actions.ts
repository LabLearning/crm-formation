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
  const champsTexte = ['statut', 'categorie', 'modalite', 'point_accueil', 'numero_dossier', 'notes',
    'date_debut_formation', 'date_fin_formation', 'date_depot', 'date_accord', 'date_remboursement', 'apprenant_id', 'formation_id']
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
