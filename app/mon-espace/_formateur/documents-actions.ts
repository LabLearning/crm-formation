'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { getPortalContext } from '@/lib/portal-auth'
import type { ActionResult } from '@/lib/types'

const DOSSIERS_BUCKET = 'dossiers'

// Trois accès possibles :
//  • le formateur via son token de portail,
//  • le formateur via son compte connecté,
//  • un gestionnaire de l'organisation qui dépose POUR un formateur donné
//    (formateurId transmis) — les pièces administratives arrivent souvent par
//    mail à l'administration plutôt que déposées par le formateur lui-même.
const ROLES_GESTION = ['super_admin', 'gestionnaire', 'directeur_commercial']

async function resolveFormateur(token: string | null, formateurIdParam?: string | null) {
  const supabase = await createServiceRoleClient()
  if (token) {
    const ctx = await getPortalContext(token)
    if (ctx && ctx.type === 'formateur') {
      return { supabase, formateurId: ctx.formateur.id, orgId: ctx.organization.id, userId: null as string | null }
    }
  }
  try {
    const session = await getSession()
    if (session.user.role === 'formateur') {
      const { data: f } = await supabase.from('formateurs').select('id').eq('user_id', session.user.id).single()
      if (!f) return null
      return { supabase, formateurId: f.id as string, orgId: session.organization.id, userId: session.user.id as string | null }
    }
    if (formateurIdParam && ROLES_GESTION.includes(session.user.role)) {
      // Contrôle d'org : le formateur ciblé doit appartenir à l'organisation
      const { data: f } = await supabase.from('formateurs').select('id')
        .eq('id', formateurIdParam).eq('organization_id', session.organization.id).maybeSingle()
      if (!f) return null
      return { supabase, formateurId: f.id as string, orgId: session.organization.id, userId: session.user.id as string | null }
    }
    return null
  } catch {
    return null
  }
}

export async function uploadFormateurDocAction(formData: FormData): Promise<ActionResult> {
  const token = (formData.get('token') as string) || null
  const ctx = await resolveFormateur(token, (formData.get('formateur_id') as string) || null)
  if (!ctx) return { success: false, error: 'Accès non autorisé' }
  const { supabase, formateurId, orgId, userId } = ctx

  const type = (formData.get('type') as string) || 'autre'
  const file = formData.get('file')
  if (!file || typeof file === 'string' || (file as File).size === 0) return { success: false, error: 'Sélectionnez un fichier' }
  const f = file as File
  if (f.size > 15 * 1024 * 1024) return { success: false, error: 'Fichier trop volumineux (max 15 Mo)' }

  const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `formateurs/${formateurId}/${Date.now()}-${safeName}`
  const buf = Buffer.from(await f.arrayBuffer())
  const { error: upErr } = await supabase.storage
    .from(DOSSIERS_BUCKET)
    .upload(path, buf, { contentType: f.type || 'application/octet-stream', upsert: false })
  if (upErr) return { success: false, error: 'Échec du téléversement' }

  const nom = ((formData.get('nom') as string) || '').trim() || f.name
  const { error } = await supabase.from('documents').insert({
    organization_id: orgId,
    formateur_id: formateurId,
    type,
    nom,
    file_url: path,
    file_name: f.name,
    file_size: f.size,
    mime_type: f.type || null,
    created_by: userId,
  })
  if (error) return { success: false, error: 'Erreur lors de l\'enregistrement' }

  revalidatePath('/mon-espace/documents')
  if (token) revalidatePath(`/portail/${token}/documents`)
  return { success: true }
}

export async function deleteFormateurDocAction(docId: string, token: string | null, cibleFormateurId?: string | null): Promise<ActionResult> {
  const ctx = await resolveFormateur(token, cibleFormateurId || null)
  if (!ctx) return { success: false, error: 'Accès non autorisé' }
  const { supabase, formateurId } = ctx

  const { data: doc } = await supabase
    .from('documents').select('id, file_url, formateur_id').eq('id', docId).maybeSingle()
  if (!doc || doc.formateur_id !== formateurId) return { success: false, error: 'Document introuvable' }

  await supabase.from('documents').delete().eq('id', docId)
  if (doc.file_url && !/^https?:\/\//.test(doc.file_url)) {
    await supabase.storage.from(DOSSIERS_BUCKET).remove([doc.file_url])
  }
  revalidatePath('/mon-espace/documents')
  if (token) revalidatePath(`/portail/${token}/documents`)
  return { success: true }
}
