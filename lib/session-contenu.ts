/**
 * Contenu pédagogique d'une session — règles d'accès côté serveur.
 *
 * Règle absolue : un support en visibilité 'formateur' n'est jamais servi à un
 * stagiaire ni à un client. Le filtrage se fait ici, dans les requêtes, jamais
 * dans le rendu — un composant ne doit recevoir que ce que son profil a le
 * droit de voir.
 */

import { DOCUMENT_TYPES_SUPPORT, type DocumentVisibilite } from '@/lib/types/document'

export type SupportAudience = 'formateur' | 'stagiaire' | 'client'

/** Visibilités consultables par chaque profil */
export const VISIBILITES_PAR_AUDIENCE: Record<SupportAudience, DocumentVisibilite[]> = {
  formateur: ['formateur', 'stagiaires', 'tous'],
  stagiaire: ['stagiaires', 'tous'],
  client: ['tous'],
}

export interface SessionSupport {
  id: string
  session_id: string | null
  formation_id?: string | null
  file_url?: string | null
  nom: string
  type: string
  description: string | null
  file_name: string | null
  file_size: number | null
  storage_path: string | null
  visibilite: DocumentVisibilite
  created_at: string
}

const SUPPORT_FIELDS =
  'id, session_id, formation_id, nom, type, description, file_name, file_size, storage_path, file_url, visibilite, created_at'

/**
 * Supports pédagogiques d'une ou plusieurs sessions, filtrés pour l'audience.
 * Retourne un dictionnaire indexé par session_id (deux requêtes, pas de N+1).
 *
 * Une session HÉRITE des supports de sa formation : un support déposé sur la
 * fiche formation vaut pour toutes ses sessions (et donc tous les portails),
 * sans dupliquer les lignes. Les supports propres à la session s'y ajoutent.
 */
export async function getSessionSupports(
  supabase: any,
  sessionIds: string[],
  audience: SupportAudience,
): Promise<Record<string, SessionSupport[]>> {
  const ids = sessionIds.filter(Boolean)
  if (ids.length === 0) return {}

  const { data: sessions } = await supabase
    .from('sessions').select('id, formation_id').in('id', ids)
  const formationIds = [...new Set((sessions || []).map((s: any) => s.formation_id).filter(Boolean))]

  const [{ data: propres }, { data: herites }] = await Promise.all([
    supabase
      .from('documents')
      .select(SUPPORT_FIELDS)
      .in('session_id', ids)
      .in('type', DOCUMENT_TYPES_SUPPORT)
      .in('visibilite', VISIBILITES_PAR_AUDIENCE[audience])
      .order('created_at', { ascending: true }),
    formationIds.length
      ? supabase
          .from('documents')
          .select(SUPPORT_FIELDS)
          .is('session_id', null)
          .in('formation_id', formationIds)
          .in('type', DOCUMENT_TYPES_SUPPORT)
          .in('visibilite', VISIBILITES_PAR_AUDIENCE[audience])
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const bySession: Record<string, SessionSupport[]> = {}
  for (const doc of (propres || []) as SessionSupport[]) {
    if (!doc.session_id) continue
    ;(bySession[doc.session_id] ||= []).push(doc)
  }
  const parFormation: Record<string, SessionSupport[]> = {}
  for (const doc of (herites || []) as any[]) {
    ;(parFormation[doc.formation_id] ||= []).push(doc)
  }
  for (const s of (sessions || []) as any[]) {
    for (const doc of parFormation[s.formation_id] || []) {
      // Pas de doublon si le même document a aussi été déposé sur la session.
      if ((bySession[s.id] || []).some((d) => d.nom === doc.nom)) continue
      ;(bySession[s.id] ||= []).push({ ...doc, session_id: s.id })
    }
  }
  return bySession
}

/** Tous les supports d'une session pour l'administrateur (aucun filtrage) —
 *  y compris ceux hérités de la fiche formation. */
export async function getAllSessionSupports(
  supabase: any,
  sessionId: string,
): Promise<SessionSupport[]> {
  const { data: sess } = await supabase
    .from('sessions').select('formation_id').eq('id', sessionId).maybeSingle()
  const [{ data: propres }, { data: herites }] = await Promise.all([
    supabase
      .from('documents')
      .select(SUPPORT_FIELDS)
      .eq('session_id', sessionId)
      .in('type', DOCUMENT_TYPES_SUPPORT)
      .order('created_at', { ascending: true }),
    sess?.formation_id
      ? supabase
          .from('documents')
          .select(SUPPORT_FIELDS)
          .is('session_id', null)
          .eq('formation_id', sess.formation_id)
          .in('type', DOCUMENT_TYPES_SUPPORT)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])
  const tous = [...(propres || [])] as SessionSupport[]
  for (const doc of (herites || []) as SessionSupport[]) {
    if (tous.some((d) => d.nom === doc.nom)) continue
    tous.push(doc)
  }
  return tous
}

export interface PositionnementRow {
  apprenant_id: string
  prenom: string
  nom: string
  fait: boolean
  score: number | null
  completed_at: string | null
  qcm_titre: string | null
}

/**
 * État du questionnaire de positionnement
 * pour les inscrits d'une session : qui l'a passé, qui ne l'a pas fait.
 * S'appuie sur qcm_reponses, la table alimentée par lib/qcm-auto-seed.ts et
 * complétée par le portail apprenant.
 */
export async function getPositionnementEtat(
  supabase: any,
  sessionId: string,
  inscrits: { id: string; prenom: string; nom: string }[],
): Promise<PositionnementRow[]> {
  if (inscrits.length === 0) return []

  const { data: reponses } = await supabase
    .from('qcm_reponses')
    .select('apprenant_id, is_complete, score, completed_at, qcm:qcm_id(titre, type)')
    .eq('session_id', sessionId)

  const pertinentes = ((reponses || []) as any[]).filter((r) =>
    r.qcm?.type === 'positionnement',
  )

  // Aucun questionnaire de positionnement/entrée rattaché à cette session :
  // on ne montre pas un bloc vide « 0/8 non passé » qui n'existe pas.
  if (pertinentes.length === 0) return []

  return inscrits.map((a) => {
    // Un apprenant peut avoir positionnement ET entrée : la réponse complétée prime
    const lignes = pertinentes.filter((r) => r.apprenant_id === a.id)
    const faite = lignes.find((r) => r.is_complete)
    return {
      apprenant_id: a.id,
      prenom: a.prenom,
      nom: a.nom,
      fait: !!faite,
      score: faite?.score != null ? Number(faite.score) : null,
      completed_at: faite?.completed_at || null,
      qcm_titre: (faite || lignes[0])?.qcm?.titre || null,
    }
  })
}
