// Envoie les 3 feuilles d'émargement de la POEI Chickeez à l'admin
import { readFileSync } from 'fs'
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { EmargementSignePDF } from '../lib/pdf/emargement-signe-pdf'

const REFS = ['POEI-2026-408', 'POEI-2026-441', 'POEI-2026-452']

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { participantsFeuille } = await import('../lib/emargement-participants')
  const { withDocumentLogo } = await import('../lib/pdf/org-logo')

  const pieces: { filename: string; content: Buffer; contentType: string }[] = []
  const recap: string[] = []
  for (const ref of REFS) {
    const { data: session } = await sb.from('sessions').select('*, formateur:formateurs(prenom, nom)').eq('reference', ref).single()
    const { data: formation } = await sb.from('formations').select('*').eq('id', session.formation_id).single()
    const { data: orgRaw } = await sb.from('organizations').select('*').eq('id', session.organization_id).single()
    const org = await withDocumentLogo(sb as any, orgRaw)
    const [apprenants, { data: emargements }, { data: feuilles }] = await Promise.all([
      participantsFeuille(sb as any, session.id),
      sb.from('emargements').select('apprenant_id, date, creneau, est_present, signature_data, signed_at, signed_via, motif_absence').eq('session_id', session.id).order('date', { ascending: true }),
      sb.from('emargement_feuilles').select('date, creneau, formateur_signature_data, validated_at').eq('session_id', session.id),
    ])
    const pdf = await renderToBuffer(createElement(EmargementSignePDF, {
      session, formation, org, apprenants, emargements: emargements || [], feuilles: feuilles || [],
    } as any) as any)
    pieces.push({ filename: `feuille-emargement-${ref}.pdf`, content: Buffer.from(pdf), contentType: 'application/pdf' })
    const signes = (emargements || []).filter((e: any) => e.signature_data).length
    recap.push(`${ref} (${new Date(session.date_debut).toLocaleDateString('fr-FR')} → ${new Date(session.date_fin).toLocaleDateString('fr-FR')}) : ${signes} signature${signes > 1 ? 's' : ''}`)
    console.log(ref, 'OK', pdf.length, 'octets')
  }

  const { data: orgRaw } = await sb.from('organizations').select('*').eq('id', 'ff747dfe-c034-44d8-98d7-e53892263fb5').single()
  const { sendDocumentEmail } = await import('../lib/email')
  const premier = pieces.shift()!
  const r = await sendDocumentEmail({
    to: 'digital@lab-learning.fr',
    orgName: orgRaw.name, orgEmail: 'digital@lab-learning.fr', orgLogoUrl: orgRaw.logo_url,
    qualiopiCertified: true,
    recipientName: 'Brahim',
    subject: 'Feuilles d\'émargement — POEI Chickeez (3 sessions)',
    docTitle: 'Feuilles d\'émargement de la POEI Chickeez',
    intro: `Les trois feuilles de la période du 22/07 au 18/08, dans leur état actuel : ${recap.join(' · ')}. Les présences de la première semaine sont complètes (108/108) ; les signatures manquantes se régularisent via les QR codes.`,
    pdfBuffer: premier.content, pdfFilename: premier.filename,
    extraAttachments: pieces,
    organizationId: 'ff747dfe-c034-44d8-98d7-e53892263fb5', entityType: 'test',
  })
  console.log(r)
}
main()
