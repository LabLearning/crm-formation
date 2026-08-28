import { readFileSync, writeFileSync } from 'fs'
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { DiplomeEtablissementPDF } from '../lib/pdf/diplome-etablissement-pdf'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: orgRaw } = await sb.from('organizations').select('*').eq('id', 'ff747dfe-c034-44d8-98d7-e53892263fb5').single()
  const { withDocumentLogo } = await import('../lib/pdf/org-logo')
  const org = await withDocumentLogo(sb as any, orgRaw)
  const pdf = await renderToBuffer(createElement(DiplomeEtablissementPDF, {
    org,
    etablissement: 'Chamas Tacos Montpellier',
    ville: 'Montpellier',
    formationIntitule: 'Hygiène alimentaire et prévention des risques',
    dateDebut: '2026-06-08', dateFin: '2026-06-09',
    stagiaires: [{ prenom: 'Sacha', nom: 'OUZEGDOUH-JOHNSON' }, { prenom: 'Abdelkader', nom: 'ZERHOUNI' }, { prenom: 'Morgane', nom: 'CLARET' }],
    formateurNom: 'Maximilien Pringault',
  }) as any)
  writeFileSync('/tmp/test-diplome.pdf', pdf)
  console.log('OK', pdf.length)
}
main()
