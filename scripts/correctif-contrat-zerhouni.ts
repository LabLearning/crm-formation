// Corrige le montant du contrat CT-2026-055 (299 €) et renvoie l'email
import { readFileSync } from 'fs'
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: conv, error } = await sb.from('conventions')
    .update({ montant_ht: 299, montant_ttc: 299 })
    .eq('numero', 'CT-2026-055').select('id, numero, signature_token, signature_client_date').single()
  if (error) throw error
  if (conv.signature_client_date) throw new Error('DÉJÀ SIGNÉ — ne pas modifier, faire un avenant')
  console.log('montant corrigé: 299 €')

  const { loadConventionForPdf } = await import('../lib/pdf/convention-data')
  const loaded = await loadConventionForPdf(sb as any, conv.id)
  const { ConventionPDF } = await import('../lib/pdf/convention-pdf')
  const pdf = await renderToBuffer(createElement(ConventionPDF, { convention: loaded!.convention, org: loaded!.org }) as any)

  const { data: orgRaw } = await sb.from('organizations').select('*').eq('id', 'ff747dfe-c034-44d8-98d7-e53892263fb5').single()
  const { sendDocumentEmail } = await import('../lib/email')
  const r = await sendDocumentEmail({
    to: 'Kaderzer@icloud.com',
    orgName: orgRaw.name, orgEmail: 'digital@lab-learning.fr', orgLogoUrl: orgRaw.logo_url,
    qualiopiCertified: true,
    recipientName: 'M. Abdelkader Zerhouni',
    subject: `Contrat de formation ${conv.numero} — version corrigée à signer`,
    docTitle: 'Votre contrat de formation (version corrigée)',
    intro: `Veuillez trouver ci-joint la version corrigée de votre contrat de formation (montant : 299 € net de TVA) pour la formation Hygiène alimentaire des 8 et 9 juin 2026. Merci de ne tenir compte que de ce document, qui remplace l'envoi précédent. Vous pouvez signer en ligne via le bouton ci-dessous.`,
    metadata: [
      ['Référence', conv.numero],
      ['Dates', '8 et 9 juin 2026'],
      ['Formateur', 'Maximilien Pringault'],
      ['Montant', '299 € net de TVA'],
    ],
    ctaLabel: 'Signer le contrat en ligne',
    ctaUrl: `https://crm.lab-learning.fr/convention/${conv.signature_token}/signer`,
    pdfBuffer: pdf, pdfFilename: `contrat-formation-${conv.numero}.pdf`,
    organizationId: 'ff747dfe-c034-44d8-98d7-e53892263fb5', entityType: 'convention', entityId: conv.id,
  })
  console.log('email:', r)
}
main()
