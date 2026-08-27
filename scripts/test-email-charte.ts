// Test visuel de la nouvelle charte email — envoie un mail avec PDF à l'admin
// Usage : npx tsx scripts/test-email-charte.ts
import { readFileSync } from 'fs'
// Charge .env.local (tsx ne le fait pas)
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('=')
  if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}

async function main() {
  const { sendDocumentEmail } = await import('../lib/email')
  const pdf = readFileSync('/tmp/test-facture-acquittee.pdf')
  const r = await sendDocumentEmail({
    to: 'digital@lab-learning.fr',
    orgName: 'Lab Learning',
    orgEmail: 'digital@lab-learning.fr',
    qualiopiCertified: true,
    recipientName: 'Brahim',
    subject: 'Test — nouvelle charte email Lab Learning',
    docTitle: 'Aperçu de la nouvelle charte',
    intro: "Voici l'email type avec la nouvelle identité : en-tête pine, fond slate, accents verts. En pièce jointe, un PDF de facture acquittée pour vérifier l'ensemble du parcours.",
    metadata: [
      ['En-tête', 'Pine #205040'],
      ['Fond', 'Slate #F6F8FA'],
      ['Accent', 'Menthe #5CD9A0'],
      ['Police', 'Manrope (repli Segoe UI)'],
    ],
    ctaLabel: 'Ouvrir le CRM',
    ctaUrl: 'https://crm.lab-learning.fr/dashboard',
    footerNote: 'Email de test envoyé par Claude — nouvelle charte design system.',
    pdfBuffer: pdf,
    pdfFilename: 'facture-acquittee-test.pdf',
    organizationId: 'ff747dfe-c034-44d8-98d7-e53892263fb5',
    entityType: 'test',
  })
  console.log(r)
}
main()
