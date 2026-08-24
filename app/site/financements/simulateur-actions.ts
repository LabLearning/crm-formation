'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { isPlaceholderEmail } from '@/lib/utils'

const ORG = process.env.PUBLIC_SITE_ORG || 'ff747dfe-c034-44d8-98d7-e53892263fb5'

/**
 * Fin du simulateur de prise en charge : la demande d'étude devient un LEAD
 * dans le CRM (source « simulateur financement »), avec tout le contexte —
 * SIRET, branche, formation, estimation — et un email part à l'équipe.
 */
export async function demanderEtudeFinancementAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const nom = String(formData.get('nom') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const telephone = String(formData.get('telephone') || '').trim()
  const entreprise = String(formData.get('entreprise') || '').trim()
  const siret = String(formData.get('siret') || '').replace(/\s/g, '')
  const branche = String(formData.get('branche') || '').trim()
  const formation = String(formData.get('formation') || '').trim()
  const formationId = String(formData.get('formation_id') || '').trim()
  const stagiaires = parseInt(String(formData.get('stagiaires') || '0'), 10) || null
  const estimation = String(formData.get('estimation') || '').trim()
  const dejaForme = String(formData.get('deja_forme') || '') === 'oui'

  if (!nom || (!email && !telephone)) return { success: false, error: 'Votre nom et un moyen de contact sont requis.' }
  if (email && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || isPlaceholderEmail(email))) {
    return { success: false, error: 'Adresse email invalide.' }
  }

  const commentaire = [
    'Demande issue du simulateur de prise en charge (site).',
    branche ? `Branche : ${branche}` : null,
    estimation ? `Estimation affichée : ${estimation}` : null,
    dejaForme ? 'A déjà mobilisé de la formation cette année (plafond annuel à vérifier).' : 'Aucune formation mobilisée cette année.',
  ].filter(Boolean).join('\n')

  try {
    const supabase = await createServiceRoleClient()
    const { error } = await supabase.from('leads').insert({
      organization_id: ORG,
      entreprise: entreprise || nom,
      siret: siret || null,
      contact_nom: nom,
      contact_email: email || null,
      contact_telephone: telephone || null,
      source: 'site_simulateur_financement',
      status: 'nouveau',
      formation_souhaitee: formation || null,
      formation_id: formationId || null,
      nombre_stagiaires: stagiaires,
      branche: branche || null,
      commentaire,
    })
    if (error) {
      console.error('[simulateur lead]', error.message)
      return { success: false, error: "Enregistrement impossible — réessayez ou contactez-nous directement." }
    }

    // Notification équipe — l'échec d'email ne bloque pas le lead.
    try {
      const { sendBrandedEmail } = await import('@/lib/email')
      const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
      await sendBrandedEmail({
        to: 'digital@lab-learning.fr',
        subject: `Simulateur financement — ${entreprise || nom}`,
        html: `<div style="font-family:sans-serif;line-height:1.6">
          <h2 style="color:#195144">Nouvelle demande d'étude de financement</h2>
          <p><strong>${esc(nom)}</strong>${entreprise ? ` — ${esc(entreprise)}` : ''}<br/>
          ${email ? `${esc(email)}<br/>` : ''}${telephone ? `${esc(telephone)}<br/>` : ''}
          ${siret ? `SIRET : ${esc(siret)}<br/>` : ''}</p>
          <p style="white-space:pre-wrap;background:#f6f4ef;border-radius:12px;padding:12px 16px">${esc(commentaire)}${formation ? `\nFormation : ${esc(formation)}` : ''}${stagiaires ? `\nStagiaires : ${stagiaires}` : ''}</p>
        </div>`,
        orgName: 'Lab Learning',
        organizationId: ORG,
        entityType: 'lead_site',
      })
    } catch { /* le lead est déjà en base */ }

    return { success: true }
  } catch (e) {
    console.error('[simulateur]', e)
    return { success: false, error: 'Une erreur est survenue — réessayez.' }
  }
}
