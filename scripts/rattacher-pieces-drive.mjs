#!/usr/bin/env node
/**
 * Rattachement des pièces de l'archive sales@ (Drive) aux sessions du CRM.
 *
 * POURQUOI : 153 sessions n'avaient aucune convention au CRM alors que la
 * pièce signée existe dans l'archive Drive des mails de sales@. L'onglet
 * « 9. Pièces par session » de la matrice a déjà fait le rapprochement
 * (418 conventions, 392 accords PEC, 165 certificats, factures, émargements)
 * avec sa fiabilité (n° dossier = certain, client+date = probable).
 *
 * COMMENT : chaque pièce devient une ligne documents rattachée à la session
 * (type CRM correspondant, lien Drive en file_url — l'ouverture retombe sur
 * le lien externe). On n'ajoute une pièce QUE si la session n'a encore aucun
 * document de ce type ; jamais deux fois le même lien. La fiabilité du
 * rapprochement est écrite dans la description.
 *
 * USAGE : node scripts/rattacher-pieces-drive.mjs           (simulation)
 *         node scripts/rattacher-pieces-drive.mjs --ecrire  (application)
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
const normD = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const normN = (s) => String(s || '').toUpperCase().replace(/Œ/g, 'OE').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(SARL|SAS|SASU|EURL|SA|SNC)\b/g, '').replace(/[^A-Z0-9]/g, '')
const jour = (s) => { const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null }

const [sessions, clients, documents] = await Promise.all([
  tout('sessions', 'id, reference, numero_dossier_opco, client_id, date_debut'),
  tout('clients', 'id, raison_sociale, nom_commercial'),
  tout('documents', 'id, session_id, type, file_url'),
])
const parClient = new Map(clients.map((c) => [c.id, c]))
const parDossier = new Map()
for (const s of sessions) for (const cle of [normD(s.numero_dossier_opco), normD(s.reference)]) if (cle && !parDossier.has(cle)) parDossier.set(cle, s)
const nomSession = (s) => { const c = parClient.get(s.client_id); return normN(c?.nom_commercial || c?.raison_sociale || '') }
const liensExistants = new Set(documents.map((d) => d.file_url).filter(Boolean))
const typesParSession = new Map()
for (const d of documents) {
  if (!d.session_id) continue
  if (!typesParSession.has(d.session_id)) typesParSession.set(d.session_id, new Set())
  typesParSession.get(d.session_id).add(d.type)
}

function trouverSession(p) {
  const m = parN.get(p.n_matrice)
  const dossier = normD(p.dossier || m?.dossier)
  if (dossier && parDossier.has(dossier)) return parDossier.get(dossier)
  const nom = normN(p.client || m?.client)
  const debut = jour(m?.debut)
  if (!nom) return null
  const memes = sessions.filter((s) => { const n = nomSession(s); return n && (n.includes(nom) || nom.includes(n)) })
  return memes.find((s) => String(s.date_debut).slice(0, 10) === debut) || (memes.length === 1 ? memes[0] : null)
}

const stats = {}
const aInserer = []
for (const p of pieces) {
  const typeCrm = TYPE_CRM[p.type]
  if (!typeCrm || !p.lien || liensExistants.has(p.lien)) continue
  const sess = trouverSession(p)
  if (!sess) { stats['sans session'] = (stats['sans session'] || 0) + 1; continue }
  const types = typesParSession.get(sess.id) || new Set()
  if (types.has(typeCrm)) { stats['déjà couvert'] = (stats['déjà couvert'] || 0) + 1; continue }
  types.add(typeCrm)
  typesParSession.set(sess.id, types)
  liensExistants.add(p.lien)
  stats[typeCrm] = (stats[typeCrm] || 0) + 1
  aInserer.push({
    organization_id: ORG,
    session_id: sess.id,
    type: typeCrm,
    nom: String(p.fichier || p.type).slice(0, 250),
    file_url: p.lien,
    date_piece: p.date && /^\d{4}-\d{2}-\d{2}/.test(p.date) ? p.date.slice(0, 10) : null,
    description: `Pièce reçue par mail (archive sales@) — rattachement ${String(p.fiabilite || '').toLowerCase() || 'par matrice'}.`,
    created_by: ADMIN,
  })
}

console.log('À rattacher :', JSON.stringify(stats))
if (ECRIRE) {
  let ok = 0
  for (let i = 0; i < aInserer.length; i += 100) {
    const { error } = await supabase.from('documents').insert(aInserer.slice(i, i + 100))
    if (error) console.error('  !!', error.message.slice(0, 90))
    else ok += Math.min(100, aInserer.length - i)
  }
  console.log(`APPLIQUÉ — ${ok} pièces rattachées.`)
} else console.log(`SIMULATION — ${aInserer.length} pièces à rattacher. Relancer avec --ecrire.`)
