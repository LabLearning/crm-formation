import { readFileSync, writeFileSync } from 'fs'
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { FacturePDF } from '../lib/pdf/facture-pdf'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: orgRaw } = await sb.from('organizations').select('*').eq('id', 'ff747dfe-c034-44d8-98d7-e53892263fb5').single()
  const { withDocumentLogo } = await import('../lib/pdf/org-logo')
  const org = await withDocumentLogo(sb as any, orgRaw)
  const facture: any = {
    numero: 'FA-2026-TEST', status: 'payee', objet: 'Formation — Jean-Louis ARNAUD',
    date_emission: '2026-08-20', date_echeance: '2026-09-20', taux_tva: 0,
    montant_ht: 2940, montant_tva: 0, montant_ttc: 2940, montant_paye: 2940, montant_restant: 0,
    client: { raison_sociale: 'ARBA', adresse: '1 rue du Test', code_postal: '34000', ville: 'Montpellier' },
    lignes: [{ id: '1', designation: 'Formation — stagiaire : Jean-Louis ARNAUD', quantite: 1, unite: 'forfait', prix_unitaire_ht: 2940, montant_ht: 2940, position: 0 }],
    paiements: [{ id: 'p1', mode: 'virement', montant: 2940, date_paiement: '2026-08-20', reference: 'VIR-2026-0042', status: 'valide' }],
    conditions_paiement: 'Paiement direct — AGEFICE.',
  }
  const pdf = await renderToBuffer(createElement(FacturePDF, { facture, org, agence: null, detail: [] }) as any)
  writeFileSync('/tmp/fact-v2.pdf', pdf)
  console.log('OK', pdf.length)
}
main()
