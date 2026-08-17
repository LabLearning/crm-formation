#!/usr/bin/env node
/**
 * Indicateurs 21/22 — rattachement des CV formateurs reçus par mail.
 *
 * POURQUOI : les CV et diplômes des formateurs arrivent sur sales@ et sont
 * archivés dans le Drive par le pont Apps Script, mais aucun formateur du CRM
 * n'avait de cv_url — l'auto-évaluation comptait 0/54 compétences justifiées
 * alors que les pièces existent.
 *
 * COMMENT : rapprochement fait à la main (email de l'expéditeur dans le nom
 * de fichier ↔ email du formateur en base, ou nom dans le titre du fichier).
 * On relie le lien Drive de la pièce RÉELLEMENT reçue — aucun document n'est
 * créé ni inventé. Les diplômes/attestations reçus sont ajoutés au champ
 * diplomes avec leur lien. Idempotent : n'écrase jamais un cv_url existant.
 *
 * USAGE : node scripts/rattacher-cv-formateurs.mjs           (simulation)
 *         node scripts/rattacher-cv-formateurs.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const D = (id) => `https://drive.google.com/file/d/${id}/view`

// formateur_id → { cv, diplomes? } — pièces identifiées dans le Drive (dossier
// de collecte sales@ + dossiers classés). Source de chaque lien : le fichier
// reçu par mail, nommé date__expediteur__fichier par l'Apps Script.
const PIECES = {
  'b5623654-cdd1-43be-ad51-3a2a59be1bad': { cv: D('1FZVr2fAut4Lbm9pWPFOqNf-EYl7N0ynw') }, // ANTOINETTE
  '68650a57-ab92-4525-9ca6-6f56319dc8cb': { cv: D('1WsA1Y4H4uuSbqNG-4c8P11iFe3TMLgpR') }, // SILVE
  'ab1cfe6e-d20e-4bb3-aa92-ce116886d3aa': { cv: D('1Y654N90kgqHzRTIAwovUhLP0qxazxUyH') }, // BUCHS
  'e636a838-242c-4f2b-9730-61bb74276860': { cv: D('1JrQQDPnGAOT_8TtWuZcalrAyCWhBt5ZD') }, // GHERRAS
  '845b63c3-e3b9-41e2-b03c-5e74a78e0643': { cv: D('18P6DuN0Ex0U8PqcYzkQp5TUVgIK4osoj') }, // PLEDRAN
  '15879df7-18a3-4ad2-91fd-a575929337c1': { cv: D('1OT3evRT0MoyuwXBMEMVPV-PEfnFe3J2_') }, // PRINGAULT
  '24aefc61-3b3a-468b-a200-4dbe202b8da9': { cv: D('17fC7r8J-5G_0LkZkA8erYM5f7UDN3an0') }, // LOCTEAU
  '8e3ccdca-a09d-4436-ba82-a624dc83d763': { cv: D('1ziAm5j8WgnwQwmA4HioDAGxWR5CcWAeY') }, // MARTINE
  'bf393c88-54f1-4fec-a1c8-11b895762e23': { cv: D('1-qjc5oSdGXNvgDrk7if9bv-Uw2qWtEI9') }, // BURON
  '6269b15a-e050-4621-9261-a28e708a5af9': { cv: D('1MTlF3zSENc84HPZi51A_gTQGon5MHF7l') }, // ALBERTINI
  '938c31a7-fc78-4ba2-a027-12e3b21f45bd': { cv: D('1Ba4sOTvwJBUVY6rL1Gii8e5GRmQWYi_O'), diplomes: [`Diplôme EPITA (pièce reçue par mail) : ${D('1h1TsDmz0uJmUv1DqYpB57yk2gTvomVda')}`] }, // DONOT
  'e08a7524-1b62-4543-b8b8-f6b71a245c30': { cv: D('1oTTaD0JYecgx3IWC7KSpw0MddL0tkcjv') }, // DEVIE
  '81f0298b-6b9e-47b9-8054-6afbca3cb365': { cv: D('1sV1P-jmVzaLDt3ZWwTD1BxERgrYJWjtD') }, // LAKHBIZA
  'fb0a1221-eea5-41be-9fa3-467e78191c98': { cv: D('1Aq0DldrMhi5XG4bVbdx3JWJho9_kpr0N'), diplomes: [`Diplôme (scan reçu par mail) : ${D('16MyGl5w3rkontAoxNaS7X4yaB9GE5cOI')}`] }, // LAVIGNE
  '953bb313-5227-400b-b4c1-9d50b95b346b': { cv: D('1daFPYBRKLxfXM5c2tvPNW3fuVNfmyfXG') }, // FRADIN
  '0ee70ef7-4576-4516-9409-3a9fdaf501e4': { cv: D('1Wk9IHW43SBXP1E7fIQc07WiU6GEe-mnB') }, // MARTIN GARCIA
  '2db94039-5486-4bcb-bb72-921fa20adf48': { cv: D('1qkEB_pavRhQj1RW13wOv66-LEy6YbC3k') }, // ROUX (1)
  'c65e41f0-f36f-4d19-b971-f1733dd8b862': { cv: D('1qkEB_pavRhQj1RW13wOv66-LEy6YbC3k') }, // ROUX (2)
  '10c23e7f-8b09-4fad-a25d-d8c399a92ac4': { cv: D('1kwVMsF_x66skMfyXvlLH2lTMv1vsFpiG'), diplomes: [`Attestation de formation spécifique en hygiène alimentaire (pièce reçue par mail) : ${D('1jcQ20vgT5LP4Cc8xYDx7OgjXahlF0jqW')}`] }, // SOLBES (1)
  'fad59f75-4be0-484b-9c9a-e88a54a45a02': { cv: D('1kwVMsF_x66skMfyXvlLH2lTMv1vsFpiG'), diplomes: [`Attestation de formation spécifique en hygiène alimentaire (pièce reçue par mail) : ${D('1jcQ20vgT5LP4Cc8xYDx7OgjXahlF0jqW')}`] }, // SOLBES (2)
  '422e878d-098d-4e37-870b-ee6429459759': { cv: D('1LoiyErA_8_ZVS1uFjHiCtqnRz0UPamjL') }, // NATEWAJKO
  '318e5c8a-26b7-4a93-ae8c-73356e1e9e7c': { cv: D('1ljper8khQptp4ql4RhHg1MyGC_sqJHOT') }, // COUPÉ
  '6ab5a078-aabb-49dc-8189-839a95ed2f8b': { cv: D('1DpnomIVgi6xbcxd6nZ92X64VQcEfnJxd') }, // SEGUY
  '3df092ee-bbcd-468f-9bb2-248f9ca5cb99': { cv: D('1FKMC59cLKMWCZ0W80A53CmXSOXw9k8Wc') }, // DEFOSSEZ
  'fb39651a-f2c9-47d3-9eb3-c50900bc50a9': { cv: D('1dm91XNJR7XvtEMwI_zyTxsaYH9tucHqf') }, // GRALA
  // À CONFIRMER par l'équipe : dossier « Attestation URSSAF-RC PRO-KBIS-CV »
  // envoyé par jmlespizzasdecedric@gmail.com — rapproché de Cédric BANCEL
  // (latelierdecedric07@) sur le prénom et l'activité pizza, emails différents.
  '1ddca10f-7540-40c4-905d-747a7dd0ec91': { cv: D('1bUXLqMBpkHeoysa4gAppPz3dZVGOhcZ-') }, // BANCEL
}

let lies = 0
for (const [id, pieces] of Object.entries(PIECES)) {
  const { data: f } = await supabase.from('formateurs').select('prenom, nom, cv_url, diplomes').eq('id', id).single()
  if (!f) { console.log(`  !! formateur introuvable ${id}`); continue }
  if (f.cv_url) { console.log(`  déjà lié : ${f.prenom} ${f.nom}`); continue }
  lies++
  console.log(`  ${f.prenom} ${f.nom}${pieces.diplomes ? ' (+ diplôme/attestation)' : ''}`)
  if (ECRIRE) {
    const maj = { cv_url: pieces.cv, updated_at: new Date().toISOString() }
    if (pieces.diplomes) maj.diplomes = [...(Array.isArray(f.diplomes) ? f.diplomes : []), ...pieces.diplomes]
    const { error } = await supabase.from('formateurs').update(maj).eq('id', id)
    if (error) console.error(`  !! ${f.nom}: ${error.message}`)
  }
}
console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${lies} formateurs reliés à leur CV reçu par mail`)
if (!ECRIRE && lies) console.log('Relancer avec --ecrire pour appliquer.')
