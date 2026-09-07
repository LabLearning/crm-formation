'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'

export interface GenerationPlanning {
  poeiId: string
  dateDebut: string          // AAAA-MM-JJ
  dateFin: string
  /** Horaires par défaut des jours travaillés (service en coupure). */
  horaires: { c1d: string; c1f: string; c2d: string | null; c2f: string | null }
  /** Un plan par candidat : jours de repos hebdomadaires (0 = dimanche … 6 = samedi). */
  candidats: { candidatId: string; joursRepos: number[] }[]
}

const JOUR_MS = 24 * 60 * 60 * 1000

/**
 * Génère le planning de travail sur la période donnée : un enregistrement par
 * jour et par candidat, repos posé sur les jours choisis, créneaux par défaut
 * ailleurs. La période demandée est REMPLACÉE pour les candidats concernés
 * (les jours hors période ne bougent pas).
 */
export async function genererPlanningPoeiAction(p: GenerationPlanning): Promise<ActionResult> {
  const session = await getSession()
  if (['apprenant', 'formateur'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const { data: poei } = await supabase.from('poei').select('id').eq('id', p.poeiId).eq('organization_id', orgId).single()
  if (!poei) return { success: false, error: 'Projet POEI introuvable' }
  if (!p.dateDebut || !p.dateFin || p.dateFin < p.dateDebut) return { success: false, error: 'Période invalide' }
  const debut = new Date(p.dateDebut + 'T12:00:00Z')
  const fin = new Date(p.dateFin + 'T12:00:00Z')
  const nbJours = Math.round((fin.getTime() - debut.getTime()) / JOUR_MS) + 1
  if (nbJours > 120) return { success: false, error: 'Période trop longue (120 jours maximum)' }
  if (!p.candidats.length) return { success: false, error: 'Aucun candidat sélectionné' }
  if (!p.horaires.c1d || !p.horaires.c1f) return { success: false, error: 'Le premier créneau est obligatoire' }

  const candidatIds = p.candidats.map((c) => c.candidatId)
  const { data: valides } = await supabase.from('poei_candidats').select('id').eq('poei_id', p.poeiId).in('id', candidatIds)
  if ((valides || []).length !== candidatIds.length) return { success: false, error: 'Candidat inconnu sur ce dossier' }

  const lignes: any[] = []
  for (const c of p.candidats) {
    const repos = new Set(c.joursRepos)
    for (let i = 0; i < nbJours; i++) {
      const jour = new Date(debut.getTime() + i * JOUR_MS)
      const estRepos = repos.has(jour.getUTCDay())
      lignes.push({
        organization_id: orgId,
        poei_id: p.poeiId,
        candidat_id: c.candidatId,
        date: jour.toISOString().slice(0, 10),
        repos: estRepos,
        creneau1_debut: estRepos ? null : p.horaires.c1d,
        creneau1_fin: estRepos ? null : p.horaires.c1f,
        creneau2_debut: estRepos ? null : p.horaires.c2d,
        creneau2_fin: estRepos ? null : p.horaires.c2f,
      })
    }
  }

  // Remplacement de la période pour les candidats concernés
  const { error: delErr } = await supabase.from('poei_plannings')
    .delete().eq('poei_id', p.poeiId).in('candidat_id', candidatIds)
    .gte('date', p.dateDebut).lte('date', p.dateFin)
  if (delErr) return { success: false, error: delErr.message }
  const { error: insErr } = await supabase.from('poei_plannings').insert(lignes)
  if (insErr) return { success: false, error: insErr.message }

  await logAudit({
    action: 'poei_planning_genere',
    entity_type: 'poei', entity_id: p.poeiId,
    details: { periode: [p.dateDebut, p.dateFin], candidats: candidatIds.length, jours: lignes.length },
  })
  revalidatePath(`/dashboard/poei/${p.poeiId}`)
  return { success: true }
}

/** Modifie un jour (repos, créneaux, note) : édition cellule par cellule. */
export async function majJourPlanningAction(
  jourId: string,
  patch: { repos?: boolean; creneau1_debut?: string | null; creneau1_fin?: string | null; creneau2_debut?: string | null; creneau2_fin?: string | null; note?: string | null },
): Promise<ActionResult> {
  const session = await getSession()
  if (['apprenant', 'formateur'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const champs: any = { updated_at: new Date().toISOString() }
  for (const k of ['repos', 'creneau1_debut', 'creneau1_fin', 'creneau2_debut', 'creneau2_fin', 'note'] as const) {
    if (k in patch) champs[k] = (patch as any)[k]
  }
  if (champs.repos === true) {
    champs.creneau1_debut = null; champs.creneau1_fin = null
    champs.creneau2_debut = null; champs.creneau2_fin = null
  }
  const { data: jour, error } = await supabase.from('poei_plannings')
    .update(champs).eq('id', jourId).eq('organization_id', session.organization.id)
    .select('poei_id').single()
  if (error || !jour) return { success: false, error: error?.message || 'Jour introuvable' }
  revalidatePath(`/dashboard/poei/${jour.poei_id}`)
  return { success: true }
}

/** Efface le planning d'un candidat (pour repartir de zéro). */
export async function effacerPlanningCandidatAction(poeiId: string, candidatId: string): Promise<ActionResult> {
  const session = await getSession()
  if (['apprenant', 'formateur'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('poei_plannings')
    .delete().eq('poei_id', poeiId).eq('candidat_id', candidatId).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/dashboard/poei/${poeiId}`)
  return { success: true }
}
