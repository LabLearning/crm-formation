#!/usr/bin/env node
/**
 * Deuxième passe de rattachement des pièces de l'archive sales@ (Drive).
 *
 * 436 pièces (conventions signées, accords, certificats par stagiaire)
 * pointent des n° de dossier AKTO absents des sessions du CRM : la session
 * existe mais son numero_dossier_opco n'a jamais été saisi. La matrice donne
 * pourtant client + date de début exacte → on matche par là.
 *
 * Pour chaque pièce placée :
 *  - la pièce devient une ligne documents (lien Drive), UNE LIGNE PAR PIÈCE
 *    (un certificat par stagiaire = plusieurs lignes légitimes)
 *  - le n° de dossier AKTO est reposé sur la session s'il manquait — ça
 *    répare aussi le rapprochement automatique des remises Bibby
 *
 * Jamais deux fois le même lien Drive. Sans correspondance stricte
 * (client + date exacte, une seule session candidate), la pièce est listée.
 *
 *   node scripts/rattacher-pieces-par-client-date.mjs           (simulation)
 *   node scripts/rattacher-pieces-par-client-date.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ADMIN = '16a538a0-ca4e-42f1-b2a0-354aea73ca46'
const SCRATCH = '/private/tmp/claude-501/-Users-brahimouchrif-Projects-crm-lablearning/04d3a660-0bb5-4829-a5e1-685cc8491e7f/scratchpad'

const TYPE_CRM = {
  'Convention / avenant': 'convention_signee',
  'Accord de prise en charge': 'accord_prise_en_charge',
  'Certificat de réalisation': 'certificat_realisation',
  'Facture': 'facture',
  "Feuille d'émargement": 'emargement_signe',
}

const pieces = JSON.parse(readFileSync(`${SCRATCH}/pieces-par-session.json`, 'utf8'))
const matrice = JSON.parse(readFileSync(`${SCRATCH}/matrice.json`, 'utf8'))
const parN = new Map(matrice.map((m) => [m.n, m]))

async function tout(table, cols) {
  const o = []
  for (let d = 0; ; d += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(d, d + 999)
    if (error) throw new Error(table + ': ' + error.message)
    o.push(...data)
    if (data.length < 1000) break
  }
  return o
}
const normD = (x) => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const normN = (x) => String(x || '').toUpperCase().replace(/Œ/g, 'OE').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(SARL|SAS|SASU|EURL|SA|SNC)\b/g, '').replace(/[^A-Z0-9]/g, '')
const jour = (x) => { const m = String(x || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null }

const [sessions, clients, documents] = await Promise.all([
  tout('sessions', 'id, reference, numero_dossier_opco, client_id, date_debut'),
  tout('clients', 'id, raison_sociale, nom_commercial'),
  tout('documents', 'id, file_url'),
])
const parClient = new Map(clients.map((c) => [c.id, c]))
const parDossier = new Map()
for (const x of sessions) for (const c of [normD(x.numero_dossier_opco), normD(x.reference)]) if (c && !parDossier.has(c)) parDossier.set(c, x)
const nomSession = (x) => { const c = parClient.get(x.client_id); return normN(c?.nom_commercial || c?.raison_sociale || '') }
const liens = new Set(documents.map((d) => d.file_url).filter(Boolean))

const aInserer = []
const dossiersAPoser = new Map() // session_id -> numero_dossier
const introuvables = []
let dejaLa = 0

for (const p of pieces) {
  const typeCrm = TYPE_CRM[p.type]
  if (!typeCrm || !p.lien) continue
  if (liens.has(p.lien)) { dejaLa++; continue }
  const m = parN.get(p.n_matrice)
  const dossier = normD(p.dossier || m?.dossier)
  let sess = dossier ? parDossier.get(dossier) : null
  if (!sess) {
    const nom = normN(p.client || m?.client)
    const debut = jour(m?.debut)
    if (nom && debut) {
      const memes = sessions.filter((x) => {
        const n = nomSession(x)
        return n && (n.includes(nom) || nom.includes(n)) && String(x.date_debut).slice(0, 10) === debut
      })
      if (memes.length === 1) sess = memes[0]
    }
  }
  if (!sess) { introuvables.push(p); continue }
  liens.add(p.lien)
  if ((p.dossier || m?.dossier) && !sess.numero_dossier_opco && !dossiersAPoser.has(sess.id)) {
    dossiersAPoser.set(sess.id, String(p.dossier || m.dossier).toUpperCase())
  }
  aInserer.push({
    organization_id: ORG,
    session_id: sess.id,
    type: typeCrm,
    nom: String(p.fichier || p.type).slice(0, 250),
    file_url: p.lien,
    date_piece: p.date && /^\d{4}-\d{2}-\d{2}/.test(p.date) ? p.date.slice(0, 10) : null,
    description: `Pièce reçue par mail (archive sales@) — rattachement client + date de début (matrice).`,
    created_by: ADMIN,
  })
}

const stats = {}
for (const x of aInserer) stats[x.type] = (stats[x.type] || 0) + 1
console.log(`À rattacher : ${aInserer.length}`, JSON.stringify(stats))
console.log(`N° de dossier AKTO à reposer sur ${dossiersAPoser.size} sessions`)
console.log(`Déjà en base (même lien) : ${dejaLa} · introuvables : ${introuvables.length}`)
for (const p of introuvables.slice(0, 20)) {
  const m = parN.get(p.n_matrice)
  console.log(`  ? [${p.type}] ${p.client || m?.client} · ${p.dossier || m?.dossier} · début ${m?.debut}`)
}

if (!ECRIRE) { console.log('\nSIMULATION — relancer avec --ecrire.'); process.exit(0) }

for (const [sessionId, numero] of dossiersAPoser) {
  const { error } = await supabase.from('sessions').update({ numero_dossier_opco: numero }).eq('id', sessionId)
  if (error) console.error('  !! dossier', numero, error.message.slice(0, 60))
}
let ok = 0
for (let i = 0; i < aInserer.length; i += 100) {
  const { error } = await supabase.from('documents').insert(aInserer.slice(i, i + 100))
  if (error) console.error('  !!', error.message.slice(0, 90))
  else ok += Math.min(100, aInserer.length - i)
}
console.log(`APPLIQUÉ — ${ok} pièces rattachées, ${dossiersAPoser.size} n° de dossier posés.`)
