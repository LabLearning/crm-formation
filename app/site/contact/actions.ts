'use server'

import { isPlaceholderEmail } from '@/lib/utils'

const CONTACT_TO = 'digital@lab-learning.fr'
const ORG = process.env.PUBLIC_SITE_ORG || 'ff747dfe-c034-44d8-98d7-e53892263fb5'

interface ContactResult { success: boolean; error?: string }

/** Formulaire de contact public du site vitrine → email à Lab Learning. */
export async function sendContactMessageAction(formData: FormData): Promise<ContactResult> {
  const nom = ((formData.get('nom') as string) || '').trim()
  const email = ((formData.get('email') as string) || '').trim()
  const entreprise = ((formData.get('entreprise') as string) || '').trim()
  const telephone = ((formData.get('telephone') as string) || '').trim()
  const sujet = ((formData.get('sujet') as string) || '').trim()
  const message = ((formData.get('message') as string) || '').trim()

  if (!nom || !email || !message) return { success: false, error: 'Nom, email et message sont requis.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || isPlaceholderEmail(email)) return { success: false, error: 'Adresse email invalide.' }
  if (message.length > 5000) return { success: false, error: 'Message trop long.' }

  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
  const html = `
    <div style="font-family:sans-serif;color:#1c1917;line-height:1.6">
      <h2 style="color:#205040">Nouveau message du site Lab Learning</h2>
      <p><strong>Nom :</strong> ${esc(nom)}<br/>
      <strong>Email :</strong> ${esc(email)}<br/>
      ${entreprise ? `<strong>Entreprise :</strong> ${esc(entreprise)}<br/>` : ''}
      ${telephone ? `<strong>Téléphone :</strong> ${esc(telephone)}<br/>` : ''}
      ${sujet ? `<strong>Sujet :</strong> ${esc(sujet)}<br/>` : ''}</p>
      <p style="white-space:pre-wrap;padding:12px 16px;background:#f6f4ef;border-radius:12px">${esc(message)}</p>
    </div>`

  try {
    const { sendBrandedEmail } = await import('@/lib/email')
    const r = await sendBrandedEmail({
      to: CONTACT_TO,
      subject: `Site web · ${sujet || 'Nouveau message'} (${nom})`,
      html,
      orgName: 'Lab Learning',
      orgEmail: email, // reply-to = l'expéditeur, pour répondre directement
      organizationId: ORG,
      entityType: 'contact_site',
    })
    if (!r.success) return { success: false, error: r.error || "Envoi impossible pour le moment." }
    return { success: true }
  } catch (e: any) {
    console.error('[contact site]', e)
    return { success: false, error: "Une erreur est survenue. Réessayez ou écrivez-nous directement." }
  }
}
