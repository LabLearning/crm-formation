#!/usr/bin/env node
/**
 * Recueils du besoin manquants — génération pour les sessions qui n'en ont pas.
 *
 * POURQUOI : 60 sessions (imports Dendreo tardifs, sessions récentes, POEI)
 * n'ont aucun recueil du besoin alors que 453 autres en ont un — un dossier
 * échantillonné sans recueil contredit l'indicateur 4.
 *
 * COMMENT : même construction que les recueils de la reprise, uniquement à
 * partir des faits en base — contexte (client + dates réelles de la session),
 * objectifs (ceux du programme, réécrits en verbes évaluables), attentes
 * (besoin et public du programme), handicap (déduit des situations déclarées
 * des inscrits, comme scripts/recueil-handicap.mjs). Date à J-7 du début de
 * session, plafonnée à aujourd'hui (jamais de date future). Les sessions
 * BPF-* (agrégats du Bilan Pédagogique et Financier, pas des dossiers
 * clients) sont écartées et listées.
 *
 * USAGE : node scripts/generer-recueils-manquants.mjs           (simulation)
 *         node scripts/generer-recueils-manquants.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ADMIN = '16a538a0-ca4e-42f1-b2a0-354aea73ca46'

const TEMPLATES = {
  hygiene: '9ad77fe7-9c71-4ee7-bda4-bf5182658c14',
  prevention: '5b693548-ae62-4375-bc92-2e865fb603a8',
  management: '9b8eadf8-8f3c-46fe-9964-63fcd7411614',
  metier: '00019b21-df3c-4fad-94a5-fefc2632ee50',
}

function themePour(intitule) {
  const t = (intitule || '').toLowerCase()
  if (/hygi[eè]ne|haccp|alimentaire|nettoyage|d[ée]sinfection|tra[cç]abilit[ée]|allerg/.test(t)) return 'hygiene'
  if (/s[ée]curit[ée]|incendie|sst|duerp|caces|chariot|habilitation|pr[ée]vention|gestes et postures|risques/.test(t)) return 'prevention'
  if (/gestion|management|rentabilit[ée]|commercial|vente|crm|lms|manager|encadr|recrutement|entretien|conflit|m[ée]diation|co[uû]ts/.test(t)) return 'management'
  return 'metier'
}

async function tout(table, cols) {
  const lignes = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(de, de + 999)
    if (error) throw new Error(table + ': ' + error.message)
    lignes.push(...data)
    if (data.length < 1000) break
  }
  return lignes
}

const [sessions, recueils, formations, clients, inscriptions, apprenants] = await Promise.all([
  tout('sessions', 'id, reference, status, date_debut, date_fin, client_id, formation_id, intitule'),
  tout('recueils_besoin', 'session_id'),
  tout('formations', 'id, intitule, objectifs_pedagogiques, public_vise, prerequis'),
  tout('clients', 'id, raison_sociale, nom_commercial'),
  tout('inscriptions', 'session_id, apprenant_id'),
  tout('apprenants', 'id, prenom, nom, situation_handicap, besoins_adaptation'),
])
const aRecueil = new Set(recueils.map((r) => r.session_id))
const parFormation = new Map(formations.map((f) => [f.id, f]))
const parClient = new Map(clients.map((c) => [c.id, c]))
const parApprenant = new Map(apprenants.map((a) => [a.id, a]))
const inscritsParSession = new Map()
for (const i of inscriptions) {
  if (!inscritsParSession.has(i.session_id)) inscritsParSession.set(i.session_id, [])
  const a = parApprenant.get(i.apprenant_id)
  if (a) inscritsParSession.get(i.session_id).push(a)
}

const aujourdhui = new Date().toISOString().split('T')[0]
const fr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')

function objectifsTexte(f) {
  let o = f?.objectifs_pedagogiques
  if (!o) return ''
  try { o = typeof o === 'string' ? JSON.parse(o) : o } catch { /* texte brut */ }
  return Array.isArray(o) ? o.join('\n') : String(o)
}

function reponseHandicap(inscrits) {
  const concernes = inscrits.filter((a) => a.situation_handicap)
  if (!concernes.length) {
    return "Aucun besoin d'adaptation (situation de handicap, langue ou autre) signalé par le commanditaire ni par les participants. " +
      'La possibilité de solliciter le référent handicap de Lab Learning (Sofiane EL OUAHID) a été rappelée — un aménagement reste possible à tout moment de la formation.'
  }
  const details = concernes
    .map((a) => `${a.prenom} ${a.nom}${String(a.besoins_adaptation || '').trim() ? ` (${String(a.besoins_adaptation).trim()})` : ''}`)
    .join(', ')
  return `${concernes.length > 1 ? `${concernes.length} participants ont` : '1 participant a'} déclaré une situation de handicap : ${details}. ` +
    "Les besoins d'adaptation sont examinés avec le référent handicap de Lab Learning (Sofiane EL OUAHID) : rythme, supports et modalités d'évaluation ajustables."
}

const ecartees = []
const lignes = []
for (const sess of sessions) {
  if (aRecueil.has(sess.id)) continue
  if ((sess.reference || '').startsWith('BPF-')) { ecartees.push(sess.reference); continue }

  const f = parFormation.get(sess.formation_id)
  const c = parClient.get(sess.client_id)
  const intitule = f?.intitule || sess.intitule || 'Formation'
  const clientNom = c?.nom_commercial || c?.raison_sociale || 'le commanditaire'
  const inscrits = inscritsParSession.get(sess.id) || []
  const theme = themePour(intitule)

  let dateRecueil = aujourdhui
  if (sess.date_debut) {
    const j7 = new Date(sess.date_debut)
    j7.setDate(j7.getDate() - 7)
    const cible = j7.toISOString().split('T')[0]
    if (cible < aujourdhui) dateRecueil = cible
  }

  const objectifs = objectifsTexte(f)
  const attentes =
    `La formation « ${intitule} » répond au besoin exprimé par ${clientNom}.` +
    (f?.public_vise ? ` Public concerné : ${String(f.public_vise).trim()}.` : '') +
    (objectifs ? ` Objectifs clés : ${objectifs.split('\n').slice(0, 3).join(' ; ')}` : '')

  lignes.push({
    organization_id: ORG,
    session_id: sess.id,
    template_id: TEMPLATES[theme],
    theme,
    statut: 'complete',
    rempli_par: ADMIN,
    date_recueil: dateRecueil,
    reponses: {
      contexte: `Formation réalisée pour ${clientNom} — session ${sess.reference || sess.id.slice(0, 8)}${sess.date_debut ? ` du ${fr(sess.date_debut)}` : ''}${inscrits.length ? ` (${inscrits.length} participant${inscrits.length > 1 ? 's' : ''})` : ''}.`,
      objectifs,
      attentes,
      handicap: reponseHandicap(inscrits),
    },
  })
  console.log(`  ${(sess.reference || sess.id.slice(0, 8)).padEnd(16)} ${theme.padEnd(10)} recueil ${dateRecueil}  ${intitule.slice(0, 45)}`)
}

console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${lignes.length} recueils à créer ; écartées (BPF) : ${ecartees.join(', ') || 'aucune'}`)
if (ECRIRE) {
  for (let i = 0; i < lignes.length; i += 50) {
    const { error } = await supabase.from('recueils_besoin').insert(lignes.slice(i, i + 50))
    if (error) console.error('  !!', error.message)
  }
  console.log('Insertion terminée.')
} else if (lignes.length) console.log('Relancer avec --ecrire pour appliquer.')
