#!/usr/bin/env node
/**
 * Indicateur 22 — datation du maintien des compétences des formateurs.
 *
 * La date posée est celle de la RÉCEPTION de la dernière pièce de compétence
 * (CV, diplôme, attestation) sur sales@ — lisible dans le nom de fichier de
 * l'archive (préfixe AAAA-MM-JJ posé par l'Apps Script) ou la date du
 * dossier classé. Aucune date d'obtention de diplôme n'est inventée : ce qui
 * est daté, c'est la vérification par l'organisme.
 *
 *   node scripts/dates-verification-formateurs.mjs           (simulation)
 *   node scripts/dates-verification-formateurs.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// formateur_id -> date de réception de la pièce (nom de fichier de l'archive
// sales@ ou date du dossier classé) + nature de la pièce.
const RECEPTIONS = {
  'b5623654-cdd1-43be-ad51-3a2a59be1bad': ['2025-12-15', 'CV reçu par mail'],            // ANTOINETTE
  '68650a57-ab92-4525-9ca6-6f56319dc8cb': ['2026-01-06', 'CV classé au dossier'],        // SILVE
  'ab1cfe6e-d20e-4bb3-aa92-ce116886d3aa': ['2026-01-22', 'CV reçu par mail'],            // BUCHS
  'e636a838-242c-4f2b-9730-61bb74276860': ['2026-02-21', 'CV reçu par mail'],            // GHERRAS
  '845b63c3-e3b9-41e2-b03c-5e74a78e0643': ['2026-01-13', 'CV reçu par mail'],            // PLEDRAN
  '15879df7-18a3-4ad2-91fd-a575929337c1': ['2026-01-20', 'CV reçu par mail'],            // PRINGAULT
  '24aefc61-3b3a-468b-a200-4dbe202b8da9': ['2026-01-31', 'CV reçu par mail'],            // LOCTEAU
  '8e3ccdca-a09d-4436-ba82-a624dc83d763': ['2026-01-06', 'CV classé au dossier'],        // MARTINE
  'bf393c88-54f1-4fec-a1c8-11b895762e23': ['2025-11-19', 'CV reçu par mail'],            // BURON
  '6269b15a-e050-4621-9261-a28e708a5af9': ['2026-01-14', 'CV reçu par mail'],            // ALBERTINI
  '938c31a7-fc78-4ba2-a027-12e3b21f45bd': ['2026-03-16', 'CV + diplôme EPITA reçus par mail'], // DONOT
  'e08a7524-1b62-4543-b8b8-f6b71a245c30': ['2026-04-08', 'CV reçu par mail'],            // DEVIE
  '81f0298b-6b9e-47b9-8054-6afbca3cb365': ['2026-04-24', 'CV reçu par mail'],            // LAKHBIZA
  'fb0a1221-eea5-41be-9fa3-467e78191c98': ['2026-03-17', 'CV + diplôme reçus par mail'], // LAVIGNE
  '953bb313-5227-400b-b4c1-9d50b95b346b': ['2026-02-25', 'CV reçu par mail'],            // FRADIN
  '0ee70ef7-4576-4516-9409-3a9fdaf501e4': ['2026-03-15', 'CV reçu par mail'],            // MARTIN GARCIA
  '2db94039-5486-4bcb-bb72-921fa20adf48': ['2026-02-07', 'CV reçu par mail'],            // ROUX (1)
  'c65e41f0-f36f-4d19-b971-f1733dd8b862': ['2026-02-07', 'CV reçu par mail'],            // ROUX (2)
  '10c23e7f-8b09-4fad-a25d-d8c399a92ac4': ['2026-03-21', 'CV + attestation hygiène reçus par mail'], // SOLBES (1)
  'fad59f75-4be0-484b-9c9a-e88a54a45a02': ['2026-03-21', 'CV + attestation hygiène reçus par mail'], // SOLBES (2)
  '422e878d-098d-4e37-870b-ee6429459759': ['2026-01-15', 'CV reçu par mail'],            // NATEWAJKO
  '318e5c8a-26b7-4a93-ae8c-73356e1e9e7c': ['2025-10-08', 'CV reçu par mail'],            // COUPÉ
  '6ab5a078-aabb-49dc-8189-839a95ed2f8b': ['2025-10-01', 'CV reçu par mail'],            // SEGUY
  '3df092ee-bbcd-468f-9bb2-248f9ca5cb99': ['2025-08-14', 'CV reçu par mail'],            // DEFOSSEZ
  'fb39651a-f2c9-47d3-9eb3-c50900bc50a9': ['2025-08-14', 'CV reçu par mail'],            // GRALA
  '1ddca10f-7540-40c4-905d-747a7dd0ec91': ['2026-01-29', 'Dossier URSSAF/RC Pro/Kbis/CV reçu par mail'], // BANCEL
  '737b02ed-65e9-4a18-968c-44f6a78b5847': ['2026-02-24', 'Certificat de réalisation reçu par mail'],     // KARROUCH
}

let poses = 0
for (const [id, [date, piece]] of Object.entries(RECEPTIONS)) {
  const { data: f } = await supabase.from('formateurs')
    .select('prenom, nom, date_derniere_habilitation, historique_habilitations').eq('id', id).maybeSingle()
  if (!f) { console.log('  introuvable', id.slice(0, 8)); continue }
  if (f.date_derniere_habilitation) { console.log(`  déjà daté : ${f.prenom} ${f.nom}`); continue }
  poses++
  console.log(`  ${(f.prenom + ' ' + f.nom).padEnd(28)} ${date}  ${piece}`)
  if (ECRIRE) {
    const historique = Array.isArray(f.historique_habilitations) ? f.historique_habilitations : []
    await supabase.from('formateurs').update({
      date_derniere_habilitation: date,
      historique_habilitations: [...historique, { date, type: 'verification_competences', piece }],
      updated_at: new Date().toISOString(),
    }).eq('id', id)
  }
}
console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${poses} formateurs datés.`)
