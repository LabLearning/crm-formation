import { readFileSync, writeFileSync } from 'fs'
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { AttestationAgeficePDF } from '../lib/pdf/attestation-agefice-pdf'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: orgRaw } = await sb.from('organizations').select('*').eq('id', 'ff747dfe-c034-44d8-98d7-e53892263fb5').single()
  const { withDocumentLogo } = await import('../lib/pdf/org-logo')
  const org = await withDocumentLogo(sb as any, orgRaw)
  const pdf = await renderToBuffer(createElement(AttestationAgeficePDF, {
    org,
    stagiaire: { civilite: 'M.', prenom: 'Jean-Louis', nom: 'ARNAUD' },
    entreprise: 'ARBA',
    formation: { intitule: 'Développer son activité commerciale' },
    dateDebut: '2026-06-01', dateFin: '2026-06-23',
    formateurNom: 'Joffrey COUPÉ', nbParticipants: 2,
    modalite: 'presentiel', heuresPrevues: 70, heuresRealisees: 70,
    montantHt: 2940, modeReglement: 'virement', referenceReglement: 'VIR-2026-0042', dateReglement: '2026-08-20',
  }) as any)
  writeFileSync('/tmp/attestation-v2.pdf', pdf)
  console.log('OK', pdf.length)
}
main()
