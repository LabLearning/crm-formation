#!/usr/bin/env node
/**
 * Rattache les feuilles d'émargement SIGNÉES retournées par les formateurs
 * (archive Drive de sales@) aux sessions du CRM — indicateur 12.
 *
 * Seuls les fichiers ENVOYÉS PAR un formateur/client comptent : ceux émis par
 * sales@ sont les feuilles vierges sorties, jamais importées. Le rapprochement
 * se fait expéditeur → formateur (ou client nommé dans le fichier) → session
 * la plus proche AVANT la date d'envoi du mail. Le lien Drive devient une
 * ligne documents (type emargement_signe), fiabilité écrite en description.
 * Jamais deux fois le même lien.
 *
 *   node scripts/rattacher-emargements-drive.mjs           (simulation)
 *   node scripts/rattacher-emargements-drive.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ECRIRE = process.argv.includes('--ecrire')
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ADMIN = '16a538a0-ca4e-42f1-b2a0-354aea73ca46'
const lien = (id) => `https://drive.google.com/file/d/${id}/view?usp=drivesdk`

// Scans signés de l'archive sales@ (titre exact vérifié dans le Drive).
// formateur = email expéditeur ; client/dateSeance quand le fichier les donne.
const SCANS = [
  { drive: '1sqJdMnsp-jhm9otyYy9TmB_yzSSDxAwJ', nom: "Feuille_emargement - HYGIÈNE ALIMENTAIRE (Solbes)", envoi: '2026-04-01', formateurNom: 'SOLBES' },
  { drive: '1hLUJVTZb3MnMEeezYK9qcHH5zOc-Qo6f', nom: "Émargement L'Original 16/04/26", envoi: '2026-04-18', clientPrefix: 'a8fbe186', dateSeance: '2026-04-16' },
  { drive: '1Pk4AgoVRRzFYH_UmZHRKyM6RYeBNwjP9', nom: "Émargement L'Original 17/04/26", envoi: '2026-04-18', clientPrefix: 'a8fbe186', dateSeance: '2026-04-17' },
  { drive: '1qGLiYakZOMjoyf3jv_HTDcz1VpQp6Z2j', nom: "Émargement L'Original 18/04/26", envoi: '2026-04-18', clientPrefix: 'a8fbe186', dateSeance: '2026-04-18' },
  { drive: '1ZhVJ5nnxV2N-simHTrm_gJgNzdhfLCNq', nom: 'BREVECO - Feuille 1 (Coupé)', envoi: '2026-04-28', formateurEmail: 'joffreycoupeformation@gmail.com' },
  { drive: '1hn87ZT24RwzigZfNL6MJSxZQft2h6par', nom: 'Feuille émargement Goussainville (Pledran)', envoi: '2026-03-16', clientPrefix: 'db999d2d' },
  { drive: '1is9oE3W32OS8HDRiQbVOoA_UQyx_1uUZ', nom: 'Feuilles émargement (Antoinette)', envoi: '2026-01-12', formateurEmail: 'angelique.antoinette@yahoo.fr' },
  { drive: '1OMFjQ2-pJCh-KUxErZYTRJUIEcQkHJQ6', nom: 'Émargement DUERP (Duchene)', envoi: '2026-01-30', formateurEmail: 'gdconsulting69@gmail.com' },
  { drive: '1Q9ROLWZFDc5Y2ntDq4y4gzXbtLWdH9Sj', nom: 'Feuille émargement HYGIÈNE (Duchene 8/12)', envoi: '2025-12-08', formateurEmail: 'gdconsulting69@gmail.com' },
  { drive: '1k2ivDCnMYt8lxbi4nK6NQr6Kiu9bP-od', nom: 'Feuille émargement DUERP (Duchene 8/12)', envoi: '2025-12-08', formateurEmail: 'gdconsulting69@gmail.com' },
  { drive: '1IvVJI-ySbtOm2GtWQgr7XqlmhrBNJ1RG', nom: 'Émargement 1 (Seguy 27/11)', envoi: '2025-11-27', formateurEmail: 'miseguy34@gmail.com' },
  { drive: '1JJ8ML7KJVsuNAscSxVeBFzGlj5qS6yLp', nom: 'Émargement 2 (Seguy 27/11)', envoi: '2025-11-27', formateurEmail: 'miseguy34@gmail.com' },
  { drive: '17NoHGhX88gWaoxlCnA1tRsquoJn_Rh_e', nom: 'Émargement 3 (Seguy 27/11)', envoi: '2025-11-27', formateurEmail: 'miseguy34@gmail.com' },
  { drive: '1PAVKwzDb-3YUL56zA-ssmZdqdNGCgL4q', nom: 'Émargement 4 (Seguy 27/11)', envoi: '2025-11-27', formateurEmail: 'miseguy34@gmail.com' },
  { drive: '1psiqE7msGbRB6EPfnnry2CbIEf4zoq3m', nom: 'Émargement 1 (Seguy 9/10)', envoi: '2025-10-09', formateurEmail: 'miseguy34@gmail.com' },
  { drive: '1BazaqOXZ7buFF7-OmcxfvWlfyeP-sI62', nom: 'Émargement 3 (Seguy 9/10)', envoi: '2025-10-09', formateurEmail: 'miseguy34@gmail.com' },
]

async function tout(table, cols) {
  const o = []
  for (let d = 0; ; d += 1000) {
    const { data, error } = await s.from(table).select(cols).range(d, d + 999)
    if (error) throw new Error(table + ': ' + error.message)
    o.push(...data)
    if (data.length < 1000) break
  }
  return o
}

const [sessions, formateurs, documents] = await Promise.all([
  tout('sessions', 'id, reference, client_id, formateur_id, date_debut, date_fin'),
  tout('formateurs', 'id, nom, prenom, email'),
  tout('documents', 'id, session_id, type, file_url'),
])
const liensConnus = new Set(documents.map((d) => d.file_url))
const emargParSession = new Set(documents.filter((d) => d.type === 'emargement_signe').map((d) => d.session_id))

function trouverSession(scan) {
  let candidates = sessions
  if (scan.formateurEmail) {
    const f = formateurs.find((x) => (x.email || '').toLowerCase() === scan.formateurEmail)
    if (!f) return { erreur: 'formateur introuvable' }
    candidates = candidates.filter((x) => x.formateur_id === f.id)
  }
  if (scan.formateurNom) {
    const f = formateurs.find((x) => (x.nom || '').toUpperCase().includes(scan.formateurNom))
    if (!f) return { erreur: 'formateur introuvable' }
    candidates = candidates.filter((x) => x.formateur_id === f.id)
  }
  if (scan.clientPrefix) candidates = candidates.filter((x) => (x.client_id || '').startsWith(scan.clientPrefix))
  // séance datée : la session qui contient la date ; sinon la plus proche AVANT l'envoi (fenêtre 120 j)
  const ref = scan.dateSeance || scan.envoi
  const avant = candidates
    .filter((x) => x.date_debut && x.date_debut <= ref)
    .filter((x) => (new Date(ref) - new Date(x.date_fin || x.date_debut)) / 864e5 <= 120)
    .sort((a, b) => (b.date_debut || '').localeCompare(a.date_debut || ''))
  if (!avant.length) return { erreur: `aucune session ≤ ${ref}` }
  return { session: avant[0], autres: avant.length - 1 }
}

let aInserer = []
for (const scan of SCANS) {
  if (liensConnus.has(lien(scan.drive))) { console.log(`déjà rattaché : ${scan.nom}`); continue }
  const r = trouverSession(scan)
  if (r.erreur) { console.log(`!! ${scan.nom} → ${r.erreur}`); continue }
  const sess = r.session
  console.log(`${scan.nom} → session ${sess.reference || sess.id.slice(0, 8)} (${sess.date_debut})${emargParSession.has(sess.id) ? ' [a déjà un émargement]' : ''}${r.autres ? ` (+${r.autres} autres candidates)` : ''}`)
  aInserer.push({
    organization_id: ORG, session_id: sess.id, type: 'emargement_signe',
    nom: `Émargement signé — ${scan.nom}`,
    description: `Scan retourné par mail à sales@ le ${scan.envoi} (archive Drive). Rapprochement formateur/client + date.`,
    file_url: lien(scan.drive), file_name: scan.nom, mime_type: 'application/pdf',
    origine: 'drive_sales', created_by: ADMIN,
  })
}
console.log(`\n${aInserer.length} pièces à rattacher.`)
if (!ECRIRE) { console.log('Simulation — relancer avec --ecrire.'); process.exit(0) }
if (aInserer.length) {
  const { error } = await s.from('documents').insert(aInserer)
  if (error) { console.error('!!', error.message); process.exit(1) }
}
console.log('Appliqué.')
