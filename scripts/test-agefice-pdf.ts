// Test visuel : attestation AGEFICE + facture acquittée — npx tsx scripts/test-agefice-pdf.ts
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { writeFileSync, readFileSync } from 'fs'
import { AttestationAgeficePDF, montantEnLettres } from '../lib/pdf/attestation-agefice-pdf'
import { FacturePDF } from '../lib/pdf/facture-pdf'

async function main() {
  console.log('2940 →', montantEnLettres(2940))
  console.log('5880.50 →', montantEnLettres(5880.5))
  console.log('71 →', montantEnLettres(71), '| 80 →', montantEnLettres(80), '| 91 →', montantEnLettres(91))

  const d = JSON.parse(readFileSync('/tmp/arba-dossier.json', 'utf8'))
  const org = { name: 'Lab Learning', numero_da: '76341315134', city: 'Montpellier', tampon_signature_url: null, logo_url: null }
  const b1 = await renderToBuffer(createElement(AttestationAgeficePDF, {
    org,
    stagiaire: d.apprenant,
    entreprise: d.client?.raison_sociale,
    formation: d.formation,
    dateDebut: d.date_debut_formation,
    dateFin: d.date_fin_formation,
    formateurNom: 'Joffrey COUPÉ',
    nbParticipants: 2,
    modalite: d.modalite,
    heuresPrevues: d.duree_heures,
    heuresRealisees: d.duree_heures,
    montantHt: 2940,
    modeReglement: 'virement',
    referenceReglement: 'VIR-2026-0042',
    dateReglement: '2026-08-20',
  }) as any)
  writeFileSync('/tmp/test-attestation-agefice.pdf', b1)

  const facture: any = {
    numero: 'FA-2026-999', status: 'payee', objet: 'Formation « Développer son activité commerciale » — Jean-Louis ARNAUD',
    date_emission: '2026-08-20', date_echeance: '2026-09-20', taux_tva: 0,
    montant_ht: 2940, montant_tva: 0, montant_ttc: 2940, montant_paye: 2940, montant_restant: 0,
    client: { raison_sociale: 'ARBA', adresse: '1 rue du Test', code_postal: '34000', ville: 'Montpellier' },
    lignes: [{ id: '1', designation: 'Formation — stagiaire : Jean-Louis ARNAUD', quantite: 1, unite: 'forfait', prix_unitaire_ht: 2940, montant_ht: 2940, position: 0 }],
    paiements: [{ id: 'p1', mode: 'virement', montant: 2940, date_paiement: '2026-08-20', reference: 'VIR-2026-0042', status: 'valide' }],
    conditions_paiement: 'Paiement direct par le bénéficiaire — financement AGEFICE.',
  }
  const b2 = await renderToBuffer(createElement(FacturePDF, { facture, org, agence: null, detail: [] }) as any)
  writeFileSync('/tmp/test-facture-acquittee.pdf', b2)
  console.log('PDF écrits', b1.length, b2.length)
}
main()
