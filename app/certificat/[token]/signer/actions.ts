'use server'

import { headers } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Signature publique (par token) du certificat de réalisation par le candidat.
 * L'horodatage réel est conservé pour la traçabilité ; la date PORTÉE sur le
 * certificat reste le dernier jour de la POEI.
 */
export async function signCertificatAction(
  token: string,
  signatureBase64: string,
  nom: string,
): Promise<{ success: boolean; error?: string }> {
  if (!signatureBase64?.startsWith('data:image/')) return { success: false, error: 'Signature invalide' }
  if (!nom?.trim()) return { success: false, error: 'Nom requis' }

  const supabase = await createServiceRoleClient()
  const { data: sig } = await supabase
    .from('certificat_signatures')
    .select('id, signed_at, token_expires_at, date_signature, poei_id')
    .eq('token', token)
    .maybeSingle()

  if (!sig) return { success: false, error: 'Lien invalide' }
  if (sig.signed_at) return { success: false, error: 'Ce certificat est déjà signé' }
  if (sig.token_expires_at && new Date(sig.token_expires_at) < new Date()) {
    return { success: false, error: 'Ce lien a expiré' }
  }

  // Filet : si la date affichée n'a pas été fixée, on la reprend de la POEI
  let dateSignature = sig.date_signature
  if (!dateSignature && sig.poei_id) {
    const { data: p } = await supabase.from('poei').select('date_fin, date_debut').eq('id', sig.poei_id).maybeSingle()
    dateSignature = p?.date_fin || p?.date_debut || null
  }

  const h = await headers()
  const { error } = await supabase
    .from('certificat_signatures')
    .update({
      signed_at: new Date().toISOString(),
      date_signature: dateSignature,
      signature_data: signatureBase64,
      signataire_nom: nom.trim(),
      ip_address: h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      user_agent: h.get('user-agent') || null,
    })
    .eq('id', sig.id)

  if (error) { console.error('[sign certificat]', error); return { success: false, error: 'Erreur lors de l\'enregistrement' } }
  return { success: true }
}
