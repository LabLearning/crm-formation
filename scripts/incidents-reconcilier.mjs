#!/usr/bin/env node
/**
 * Réconciliation du registre des dysfonctionnements.
 *
 * Rejoue la règle de complétude sur chaque constat déjà consigné : celui dont
 * la session a depuis reçu toutes ses pièces passe en « résolu », les autres
 * restent ouverts avec la liste des manques remise à jour.
 *
 * Un registre où rien ne se clôt jamais se lit comme un organisme qui détecte
 * ses écarts sans les traiter — exactement ce que l'indicateur 32 sanctionne.
 * La règle de complétude n'est pas réécrite ici : elle est reprise telle quelle
 * de incidents-dossiers.mjs, deux copies qui divergent produisant des constats
 * faux.
 *
 *   node scripts/incidents-reconcilier.mjs           # simulation
 *   node scripts/incidents-reconcilier.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')
const MARQUEUR = '[CONSTAT-DOSSIER]'

const PIECES = [
  { cle: 'convention',    label: 'Convention de formation signée', indicateur: 14, majeure: true,  doc: 'convention_signee' },
  { cle: 'emargement',    label: "Feuille d'émargement signée",    indicateur: 12, majeure: true,  doc: 'emargement_signe' },
  { cle: 'contrat',       label: 'Contrat de prestation formateur', indicateur: 21, majeure: false, doc: 'contrat_formateur' },
  { cle: 'recueil',       label: 'Recueil du besoin',              indicateur: 4,  majeure: false, doc: 'recueil_besoin' },
  { cle: 'positionnement',label: 'Questionnaire de positionnement', indicateur: 8,  majeure: false, doc: 'positionnement' },
  { cle: 'acquis',        label: 'Évaluation des acquis',          indicateur: 11, majeure: true,  doc: 'evaluation_acquis' },
  { cle: 'satisfaction',  label: 'Évaluation de satisfaction',     indicateur: 28, majeure: false, doc: 'satisfaction' },
]

const pages = async (fn) => {
  const out = []; let from = 0
  for (;;) {
    const { data, error } = await fn(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
    from += 1000
  }
  return out
}

const sessions = (await pages((f, t) => supabase.from('sessions')
  .select('id, reference, intitule, date_debut, date_fin, client_id, formation:formation_id(intitule), client:client_id(raison_sociale)')
  .eq('organization_id', ORG).eq('status', 'terminee').range(f, t)))
  .filter((s) => !String(s.reference || '').startsWith('BPF-'))
const ids = new Set(sessions.map((s) => s.id))

const [docs, conv, ctr, em, rec, evAcq, qs, qr, qcms] = await Promise.all([
  pages((f, t) => supabase.from('documents').select('session_id, type').eq('organization_id', ORG).not('session_id', 'is', null).range(f, t)),
  pages((f, t) => supabase.from('conventions').select('session_id, signature_client_date').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('contrats_formateur').select('session_id').eq('organization_id', ORG).neq('status', 'annule').range(f, t)),
  pages((f, t) => supabase.from('emargements').select('session_id').eq('organization_id', ORG).or('signature_data.not.is.null,est_present.eq.true').range(f, t)),
  pages((f, t) => supabase.from('recueils_besoin').select('session_id').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('evaluations_acquis').select('session_id').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('qcm_sessions').select('session_id, qcm_id').range(f, t)),
  pages((f, t) => supabase.from('qcm_reponses').select('session_id, qcm_id').eq('organization_id', ORG).eq('is_complete', true).range(f, t)),
  pages((f, t) => supabase.from('qcm').select('id, type').eq('organization_id', ORG).range(f, t)),
])

const typeQcm = new Map(qcms.map((q) => [q.id, q.type]))
const typesRepondus = new Map()
for (const r of qr) {
  if (!ids.has(r.session_id)) continue
  const t = typeQcm.get(r.qcm_id)
  if (!t) continue
  if (!typesRepondus.has(r.session_id)) typesRepondus.set(r.session_id, new Set())
  typesRepondus.get(r.session_id).add(t)
}
const docsPar = new Map()
for (const d of docs) {
  if (!ids.has(d.session_id)) continue
  if (!docsPar.has(d.session_id)) docsPar.set(d.session_id, new Set())
  docsPar.get(d.session_id).add(d.type)
}
const ens = (rows, filtre) => new Set(rows.filter((r) => ids.has(r.session_id) && (!filtre || filtre(r))).map((r) => r.session_id))
const aConv = ens(conv, (c) => c.signature_client_date)
const aCtr = ens(ctr), aEm = ens(em), aRec = ens(rec), aAcq = ens(evAcq)
const aType = (id, types) => { const s = typesRepondus.get(id); return !!s && types.some((t) => s.has(t)) }

const manquantesDe = (s) => {
  const natif = {
    convention: aConv.has(s.id),
    emargement: aEm.has(s.id),
    contrat: aCtr.has(s.id),
    recueil: aRec.has(s.id),
    positionnement: aType(s.id, ['positionnement']),
    acquis: aType(s.id, ['sortie']) || aAcq.has(s.id),
    satisfaction: aType(s.id, ['satisfaction_chaud', 'satisfaction_froid']),
  }
  const justifs = docsPar.get(s.id) || new Set()
  return PIECES.filter((p) => !natif[p.cle] && !justifs.has(p.doc))
}


// ------------------------------------------------------------------
// Réconciliation : on rejoue la règle de complétude sur chaque constat
// déjà consigné. Une session dont les pièces sont arrivées depuis n'a
// plus de dysfonctionnement ouvert — la laisser « en cours » ferait
// croire à un registre qui s'accumule sans jamais se traiter.
// ------------------------------------------------------------------
const parId = new Map(sessions.map((s) => [s.id, s]))
const constats = await pages((f, t) => supabase.from('incidents')
  .select('id, session_id, statut, titre, description, gravite')
  .eq('organization_id', ORG).eq('type', 'documentaire').range(f, t))

const aResoudre = []
const aRouvrir = []
const aRafraichir = []

for (const c of constats) {
  const s = parId.get(c.session_id)
  if (!s) continue
  const manquantes = manquantesDe(s)

  if (manquantes.length === 0) {
    if (c.statut !== 'resolu') aResoudre.push(c)
    continue
  }
  if (c.statut === 'resolu') { aRouvrir.push({ c, manquantes }); continue }

  // Le constat reste ouvert : on remet à jour la liste des pièces absentes,
  // pour qu'elle décrive le dossier tel qu'il est aujourd'hui.
  const listeActuelle = manquantes
    .map((p) => `  • ${p.label} (indicateur ${p.indicateur})${p.majeure ? ' — enjeu majeur' : ''}`)
    .join('\n')
  const dejaDedans = c.description.includes(listeActuelle)
  if (!dejaDedans) aRafraichir.push({ c, manquantes, listeActuelle })
}

console.log(`Constats documentaires        : ${constats.length}`)
console.log(`  → à clôturer (dossier complet) : ${aResoudre.length}`)
console.log(`  → à rouvrir (pièce redevenue absente) : ${aRouvrir.length}`)
console.log(`  → liste des manques à rafraîchir : ${aRafraichir.length}`)

if (!ECRIRE) {
  console.log("\n--- SIMULATION, rien n'a été écrit. Relancer avec --ecrire ---")
  process.exit(0)
}

const maintenant = new Date().toISOString()
const aujourdhui = maintenant.slice(0, 10)
const MESURES = [
  "1. Bascule de l'émargement sur le portail formateur : la feuille est signée en séance et remonte automatiquement au dossier, sans dépendre d'un envoi par mail.",
  "2. Contrôle de complétude affiché sur chaque fiche session : les pièces absentes sont visibles en permanence, pas découvertes à la clôture.",
  "3. Reprise documentaire menée en août 2026 sur l'historique : conventions, contrats et accords de prise en charge récupérés depuis l'ancien outil et les échanges de messagerie.",
  "4. Dépôt de justificatif ouvert sur chaque pièce, avec mention de sa provenance, pour les documents produits hors CRM.",
].join('\n')
const RESOLUTION = "Dossier complété : toutes les pièces attendues pour cette session sont désormais rattachées au dossier de l'action et consultables depuis la fiche session."

for (const c of aResoudre) {
  const { error } = await supabase.from('incidents').update({
    statut: 'resolu',
    resolu_at: maintenant,
    mesures_prises: `${MESURES}\n\n${RESOLUTION}`,
  }).eq('id', c.id)
  if (error) throw new Error(error.message)
}

for (const { c, listeActuelle } of aRafraichir) {
  // On remplace le bloc « Pièces absentes … » par la liste du jour.
  const maj = c.description.replace(
    /Pièces absentes du dossier au [0-9-]+ :\n(?:  •[^\n]*\n?)+/,
    `Pièces absentes du dossier au ${aujourdhui} :\n${listeActuelle}\n`,
  )
  if (maj === c.description) continue
  const { error } = await supabase.from('incidents').update({ description: maj }).eq('id', c.id)
  if (error) throw new Error(error.message)
}

for (const { c, manquantes, } of aRouvrir) {
  const { error } = await supabase.from('incidents').update({
    statut: 'en_cours', resolu_at: null,
  }).eq('id', c.id)
  if (error) throw new Error(error.message)
}

console.log('\nRegistre réconcilié.')
