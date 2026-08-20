#!/usr/bin/env node
/**
 * Troisième passe : rattache les pièces de l'arborescence Drive « un dossier
 * par action » (NNN - n°AKTO - CLIENT - date) aux sessions du CRM.
 *
 * Ces dossiers ont été montés le 18/08 pour l'audit ; leurs pièces (conventions
 * signées, avenants, accords PEC, feuilles d'émargement) n'ont jamais été
 * versées au CRM. Le nom du dossier parent porte le n° AKTO → rapprochement
 * certain avec la session (numero_dossier_opco ou reference).
 *
 * Règles : type déduit du préfixe du fichier ; on n'attache que si la session
 * n'a PAS encore de pièce de ce type (remplir les trous, pas dupliquer) ;
 * jamais deux fois le même lien Drive. Les listes viennent du scratchpad
 * (drive-dossiers.json + drive-pieces.json).
 *
 *   node scripts/rattacher-pieces-drive-dossiers.mjs           (simulation)
 *   node scripts/rattacher-pieces-drive-dossiers.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ADMIN = '16a538a0-ca4e-42f1-b2a0-354aea73ca46'
const SCRATCH = '/private/tmp/claude-501/-Users-brahimouchrif-Projects-crm-lablearning/04d3a660-0bb5-4829-a5e1-685cc8491e7f/scratchpad'

const dossiers = JSON.parse(readFileSync(`${SCRATCH}/drive-dossiers.json`))
const brutes = JSON.parse(readFileSync(`${SCRATCH}/drive-pieces.json`))
const pieces = [...new Map(brutes.map((x) => [x.id, x])).values()]

const normD = (x) => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const lien = (id) => `https://drive.google.com/file/d/${id}/view?usp=drivesdk`
function typeDe(titre) {
  if (/^Convention - /.test(titre)) return 'convention_signee'
  if (/^Emargement - /.test(titre)) return 'emargement_signe'
  if (/^Accord PEC - /.test(titre)) return 'accord_prise_en_charge'
  if (/^Certificat/.test(titre)) return 'certificat_realisation'
  return null
}

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

const [sessions, documents] = await Promise.all([
  tout('sessions', 'id, reference, numero_dossier_opco'),
  tout('documents', 'session_id, type, file_url'),
])
const parDossier = new Map()
for (const x of sessions) for (const c of [normD(x.numero_dossier_opco), normD(x.reference)]) if (c && !parDossier.has(c)) parDossier.set(c, x)
const liens = new Set(documents.map((d) => d.file_url).filter(Boolean))
const typesParSession = new Map()
for (const d of documents) {
  if (!d.session_id) continue
  if (!typesParSession.has(d.session_id)) typesParSession.set(d.session_id, new Set())
  typesParSession.get(d.session_id).add(d.type)
}

const sessionParFolder = new Map()
const dossierParFolder = new Map()
let foldersSansSession = 0
for (const [fid, titre] of Object.entries(dossiers)) {
  const m = titre.match(/^\d+ - (\S+) - /)
  const sess = m ? parDossier.get(normD(m[1])) : null
  if (sess) { sessionParFolder.set(fid, sess); dossierParFolder.set(fid, m[1]) }
  else foldersSansSession++
}

const aInserer = []
const stats = { deja_lien: 0, deja_type: 0, folder_inconnu: 0 }
const numerosAPoser = new Map()
for (const p of pieces) {
  const type = typeDe(p.t)
  if (!type) continue
  const sess = sessionParFolder.get(p.p)
  if (!sess) { stats.folder_inconnu++; continue }
  if (liens.has(lien(p.id))) { stats.deja_lien++; continue }
  const types = typesParSession.get(sess.id) || new Set()
  if (types.has(type)) { stats.deja_type++; continue }
  liens.add(lien(p.id))
  if (!sess.numero_dossier_opco && dossierParFolder.get(p.p)) numerosAPoser.set(sess.id, dossierParFolder.get(p.p))
  aInserer.push({
    organization_id: ORG, session_id: sess.id, type,
    nom: p.t.replace(/^[^-]+ - /, '').slice(0, 250),
    file_url: lien(p.id),
    description: `Pièce du dossier Drive « ${dossiers[p.p]} » — rapprochement par n° de dossier AKTO.`,
    created_by: ADMIN,
  })
  // On ne bloque pas les autres pièces du même type de CE dossier : une action
  // à deux formations a deux conventions légitimes. Le verrou ne vaut que
  // contre ce qui existait déjà en base.
}

const parType = {}
for (const x of aInserer) parType[x.type] = (parType[x.type] || 0) + 1
console.log(`pièces uniques: ${pieces.length} | dossiers Drive matchés: ${sessionParFolder.size} (${foldersSansSession} sans session)`)
console.log(`à insérer: ${aInserer.length}`, JSON.stringify(parType))
console.log(`ignorées — lien déjà en base: ${stats.deja_lien}, type déjà couvert: ${stats.deja_type}, dossier non matché: ${stats.folder_inconnu}`)
console.log(`n° de dossier AKTO à poser: ${numerosAPoser.size}`)

if (!ECRIRE) { console.log('\nSIMULATION — relancer avec --ecrire.'); process.exit(0) }
for (const [sid, num] of numerosAPoser) {
  await s.from('sessions').update({ numero_dossier_opco: String(num).toUpperCase() }).eq('id', sid)
}
let ok = 0
for (let i = 0; i < aInserer.length; i += 100) {
  const { error } = await s.from('documents').insert(aInserer.slice(i, i + 100))
  if (error) console.error('!!', error.message.slice(0, 90))
  else ok += Math.min(100, aInserer.length - i)
}
console.log(`APPLIQUÉ — ${ok} pièces, ${numerosAPoser.size} n° posés.`)
