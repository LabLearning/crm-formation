'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function updateProfilFormateurAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!formateur) return { success: false, error: 'Fiche formateur introuvable' }

  const updateData: Record<string, any> = {
    prenom: (formData.get('prenom') as string)?.trim() || '',
    nom: (formData.get('nom') as string)?.trim() || '',
    telephone: (formData.get('telephone') as string)?.trim() || null,
    bio: (formData.get('bio') as string)?.trim() || null,
    adresse: (formData.get('adresse') as string)?.trim() || null,
    ville: (formData.get('ville') as string)?.trim() || null,
    code_postal: (formData.get('code_postal') as string)?.trim() || null,
    siret: (formData.get('siret') as string)?.trim() || null,
    tarif_journalier: formData.get('tarif_journalier') ? parseFloat(formData.get('tarif_journalier') as string) : null,
    tarif_horaire: formData.get('tarif_horaire') ? parseFloat(formData.get('tarif_horaire') as string) : null,
  }

  // Photo upload
  const photoBase64 = formData.get('photo') as string
  if (photoBase64 && photoBase64.startsWith('data:image/')) {
    const buffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    const path = `${session.organization.id}/${formateur.id}/photo_${Date.now()}.jpg`
    const { error: uploadErr } = await supabase.storage.from('formateurs').upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('formateurs').getPublicUrl(path)
      updateData.photo_url = urlData?.publicUrl || null
    }
  }

  // CV upload
  const cvBase64 = formData.get('cv') as string
  if (cvBase64 && cvBase64.startsWith('data:')) {
    const match = cvBase64.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      const buffer = Buffer.from(match[2], 'base64')
      const ext = match[1].includes('pdf') ? 'pdf' : 'doc'
      const path = `${session.organization.id}/${formateur.id}/cv_${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('formateurs').upload(path, buffer, { contentType: match[1], upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('formateurs').getPublicUrl(path)
        updateData.cv_url = urlData?.publicUrl || null
      }
    }
  }

  // Diplômes (JSON)
  const diplomesStr = formData.get('diplomes') as string
  if (diplomesStr) {
    try { updateData.diplomes = JSON.parse(diplomesStr) } catch { /* ignore */ }
  }

  const { error } = await supabase.from('formateurs').update(updateData).eq('id', formateur.id)

  if (error) return { success: false, error: error.message }

  // Mettre à jour aussi la table users
  await supabase.from('users').update({
    first_name: updateData.prenom,
    last_name: updateData.nom,
  }).eq('id', session.user.id)

  revalidatePath('/dashboard/formateur-home')
  return { success: true }
}
