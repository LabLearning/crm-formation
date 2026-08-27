// Contrat de formation particulier — Abdelkader ZERHOUNI, session hygiène 08-09/06
import { readFileSync } from 'fs'
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createHash, randomBytes } from 'crypto'

const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const SESSION = '7c9fad25-39c1-466c-9199-c2e45ce59c2d'
const APPRENANT = 'a28c4276-489e-40c6-8765-993d25de7902'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 1. Fiche client particulier pour ZERHOUNI (rattachée à l'apprenant)
  let { data: cli } = await sb.from('clients').select('id').eq('organization_id', ORG).eq('type', 'particulier').ilike('nom', 'ZERHOUNI').maybeSingle()
  if (!cli) {
    const r = await sb.from('clients').insert({
      organization_id: ORG, type: 'particulier', civilite: 'M.',
      nom: 'ZERHOUNI', prenom: 'Abdelkader', raison_sociale: 'ZERHOUNI Abdelkader',
      email: 'Kaderzer@icloud.com', financeur_type: 'fonds_propres',
    }).select('id').single()
    if (r.error) throw new Error('client: ' + r.error.message)
    cli = r.data
    await sb.from('apprenants').update({ client_id: cli!.id }).eq('id', APPRENANT)
  }
  console.log('client particulier:', cli!.id)

  // 2. Session + formation (tarif inter)
  const { data: sess } = await sb.from('sessions')
    .select('*, formation:formation_id(intitule, duree_heures, tarif_inter_ht)').eq('id', SESSION).single()
  const tarif = Number((sess as any).formation?.tarif_inter_ht || 0) || null

  // 3. Contrat (ligne conventions, snapshot = ZERHOUNI seul)
  const { count } = await sb.from('conventions').select('*', { count: 'exact', head: true }).eq('organization_id', ORG)
  const numero = `CT-2026-${String((count || 0) + 1).padStart(3, '0')}`
  const token = createHash('sha256').update(randomBytes(32)).digest('hex')
  const expire = new Date(); expire.setDate(expire.getDate() + 30)
  const { data: conv, error: eConv } = await sb.from('conventions').insert({
    organization_id: ORG, numero, type: 'inter_entreprise', session_id: SESSION,
    client_id: cli!.id, formation_id: sess.formation_id, status: 'envoyee',
    objet: `Contrat de formation professionnelle — ${(sess as any).formation?.intitule || 'Formation'}`,
    nombre_stagiaires: 1, duree_heures: (sess as any).formation?.duree_heures || 14,
    lieu: sess.lieu || null, dates_formation: 'Du 08/06/2026 au 09/06/2026',
    montant_ht: tarif, taux_tva: 0, montant_ttc: tarif,
    participants_snapshot: [{ apprenant_id: APPRENANT, nom: 'ZERHOUNI', prenom: 'Abdelkader' }],
    signature_token: token, signature_token_expires_at: expire.toISOString(),
    sent_at: new Date().toISOString(), date_emission: new Date().toISOString().slice(0, 10),
  }).select('id, numero').single()
  if (eConv) throw new Error('contrat: ' + eConv.message)
  console.log('contrat:', conv.numero)
  const url = `https://crm.lab-learning.fr/convention/${token}/signer`

  // 4. PDF du contrat (variante particulier via client.type)
  const { loadConventionForPdf } = await import('../lib/pdf/convention-data')
  const loaded = await loadConventionForPdf(sb as any, conv.id)
  const { ConventionPDF } = await import('../lib/pdf/convention-pdf')
  const pdf = await renderToBuffer(createElement(ConventionPDF, { convention: loaded!.convention, org: loaded!.org }) as any)
  console.log('pdf:', pdf.length, 'octets')

  // 5. Email de signature
  const { data: orgRaw } = await sb.from('organizations').select('*').eq('id', ORG).single()
  const { sendDocumentEmail } = await import('../lib/email')
  const r = await sendDocumentEmail({
    to: 'Kaderzer@icloud.com',
    orgName: orgRaw.name, orgEmail: 'digital@lab-learning.fr', orgLogoUrl: orgRaw.logo_url,
    qualiopiCertified: true,
    recipientName: 'M. Abdelkader Zerhouni',
    subject: `Contrat de formation ${conv.numero} — signature requise`,
    docTitle: 'Votre contrat de formation à signer',
    intro: `Vous trouverez ci-joint votre contrat de formation professionnelle pour la formation « ${(sess as any).formation?.intitule || ''} » des 8 et 9 juin 2026, animée par Maximilien Pringault. Vous pouvez le signer en ligne en quelques secondes via le bouton ci-dessous. Conformément au Code du travail, vous disposez d'un délai de rétractation de 10 jours à compter de la signature.`,
    metadata: [
      ['Référence', conv.numero],
      ['Formation', (sess as any).formation?.intitule || ''],
      ['Dates', '8 et 9 juin 2026'],
      ['Formateur', 'Maximilien Pringault'],
      ...(tarif ? [['Montant', `${tarif.toLocaleString('fr-FR')} € net de TVA`] as [string, string]] : []),
    ],
    ctaLabel: 'Signer le contrat en ligne',
    ctaUrl: url,
    pdfBuffer: pdf, pdfFilename: `contrat-formation-${conv.numero}.pdf`,
    organizationId: ORG, entityType: 'convention', entityId: conv.id,
  })
  console.log('email:', r, '| lien:', url)
}
main()
