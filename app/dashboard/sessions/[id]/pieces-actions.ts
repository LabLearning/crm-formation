'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { PIECES } from '@/lib/pieces-session'
import type { ActionResult } from '@/lib/types'

const ROLES = ['super_admin', 'gestionnaire', 'directeur_commercial']

/**
 * Dépose le justificatif d'une pièce du dossier.
 *
 * Le fichier arrive tel qu'il a été reçu — un PDF de l'ancien outil, un scan,
 * une pièce jointe de mail. On enregistre sa provenance : c'est elle qui
 * explique à l'auditeur pourquoi la preuve n'a pas été produite par le CRM.
 */
export async function deposerPieceAction(sessionId: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const cle = String(formData.get('piece') || '')
  const piece = PIECES.find((p) => p.cle === cle)
  if (!piece) return { success: false, error: 'Pièce inconnue' }

  const fichier = formData.get('fichier') as File | null
  if (!fichier || fichier.size === 0) return { success: false, error: 'Aucun fichier' }
  if (fichier.size > 15 * 1024 * 1024) return { success: false, error: 'Fichier trop lourd (15 Mo maximum)' }

  const { data: sess } = await supabase
    .from('sessions').select('id, reference, client_id').eq('id', sessionId).eq('organization_id', orgId).maybeSingle()
  if (!sess) return { success: false, error: 'Session introuvable' }

  const ext = (fichier.name.split('.').pop() || 'pdf').toLowerCase()
  const chemin = `${orgId}/sessions/${sessionId}/${cle}-${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('documents')
    .upload(chemin, Buffer.from(await fichier.arrayBuffer()), {
      contentType: fichier.type || 'application/pdf',
      upsert: false,
    })
  if (upErr) {
    console.error('[depot piece]', upErr.message)
    return { success: false, error: 'Dépôt du fichier impossible' }
  }

  const { data, error } = await supabase.from('documents').insert({
    organization_id: orgId,
    nom: `${piece.label} — ${(sess as any).reference || 'session'}`,
    type: piece.typeDocument,
    session_id: sessionId,
    client_id: (sess as any).client_id || null,
    storage_path: chemin,
    file_name: fichier.name,
    file_size: fichier.size,
    mime_type: fichier.type || null,
    origine: String(formData.get('origine') || 'mail'),
    date_piece: String(formData.get('date_piece') || '') || null,
    description: String(formData.get('description') || '') || null,
    created_by: session.user.id,
  }).select('id').single()

  if (error) {
    // Le fichier est déjà déposé : on le retire pour ne pas laisser d'orphelin.
    await supabase.storage.from('documents').remove([chemin])
    console.error('[depot piece]', error)
    if ((error as any).code === '22P02' || (error as any).code === '42703') {
      return { success: false, error: 'Types absents : appliquer la migration 124_pieces_dossier_session.sql' }
    }
    return { success: false, error: "Enregistrement impossible" }
  }

  await logAudit({ action: 'create', entity_type: 'document', entity_id: data.id, details: { session: sessionId, piece: cle } })
  revalidatePath(`/dashboard/sessions/${sessionId}`)
  revalidatePath('/dashboard/qualiopi/dossiers')
  return { success: true, data }
}

/** Retire un justificatif déposé par erreur. */
export async function retirerPieceAction(documentId: string, sessionId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { data: doc } = await supabase
    .from('documents').select('id, storage_path').eq('id', documentId).eq('organization_id', session.organization.id).maybeSingle()
  if (!doc) return { success: false, error: 'Document introuvable' }

  if ((doc as any).storage_path) await supabase.storage.from('documents').remove([(doc as any).storage_path])
  const { error } = await supabase.from('documents').delete().eq('id', documentId)
  if (error) return { success: false, error: 'Suppression impossible' }

  await logAudit({ action: 'delete', entity_type: 'document', entity_id: documentId })
  revalidatePath(`/dashboard/sessions/${sessionId}`)
  revalidatePath('/dashboard/qualiopi/dossiers')
  return { success: true }
}

/** Lien de téléchargement temporaire d'un justificatif. */
export async function lienPieceAction(documentId: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const { data: doc } = await supabase
    .from('documents').select('storage_path, file_url').eq('id', documentId).eq('organization_id', session.organization.id).maybeSingle()
  if (!doc) return { success: false, error: 'Document introuvable' }

  // Pièce archivée hors storage (lien Drive de l'archive sales@) : le lien
  // externe fait foi.
  if (!doc.storage_path) {
    if ((doc as any).file_url?.startsWith('http')) return { success: true, data: { url: (doc as any).file_url } }
    return { success: false, error: 'Document introuvable' }
  }

  const { data } = await supabase.storage.from('documents').createSignedUrl((doc as any).storage_path, 3600)
  if (!data?.signedUrl) return { success: false, error: 'Lien indisponible' }
  return { success: true, data: { url: data.signedUrl } }
}
