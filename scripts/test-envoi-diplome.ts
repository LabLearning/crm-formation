import { readFileSync } from 'fs'
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}

async function main() {
  const pdf = readFileSync('/tmp/test-diplome.pdf')
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: orgRaw } = await sb.from('organizations').select('*').eq('id', 'ff747dfe-c034-44d8-98d7-e53892263fb5').single()
  const { sendDocumentEmail } = await import('../lib/email')
  const r = await sendDocumentEmail({
    to: 'digital@lab-learning.fr',
    orgName: orgRaw.name, orgEmail: 'digital@lab-learning.fr', orgLogoUrl: orgRaw.logo_url,
    qualiopiCertified: true,
    recipientName: 'Brahim',
    subject: 'Test — diplôme d\'établissement (hygiène alimentaire)',
    docTitle: 'Aperçu : email automatique de clôture hygiène',
    intro: "Voici l'email type que recevra chaque établissement à la clôture d'une session hygiène : les attestations de son personnel + ce diplôme à encadrer. Exemple généré avec Chamas Tacos Montpellier et 3 stagiaires.",
    metadata: [
      ['Établissement', 'Chamas Tacos Montpellier'],
      ['Formation', 'Hygiène alimentaire et prévention des risques'],
    ],
    pdfBuffer: pdf, pdfFilename: 'diplome-etablissement-test.pdf',
    organizationId: 'ff747dfe-c034-44d8-98d7-e53892263fb5', entityType: 'test',
  })
  console.log(r)
}
main()
