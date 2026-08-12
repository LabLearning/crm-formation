#!/usr/bin/env node
/**
 * Quels dossiers compléter en priorité avant l'audit.
 *
 * Un audit de surveillance échantillonne une poignée de dossiers, pas les 478
 * incomplets. Il tire sur les actions récentes, et un dossier auquel il ne
 * manque qu'une pièce se complète en quelques minutes.
 *
 * Ce classement croise donc deux choses : la probabilité d'être tiré (récence)
 * et le coût pour boucler (nombre de pièces absentes). Il ne masque rien — il
 * dit par où commencer.
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


const AUJ = new Date()
const moisEcoules = (d) => (AUJ - new Date(d)) / (1000 * 86400 * 30.4)

const candidats = sessions
  .map((s) => {
    const manquantes = manquantesDe(s)
    const age = moisEcoules(s.date_fin || s.date_debut)
    return { s, manquantes, age }
  })
  // L'audit porte sur la période depuis la certification : on garde 18 mois.
  .filter((c) => c.manquantes.length > 0 && c.age <= 18)
  .sort((a, b) =>
    a.manquantes.length - b.manquantes.length ||
    a.age - b.age)

const sur18 = sessions.filter((s) => moisEcoules(s.date_fin || s.date_debut) <= 18)
const completes = sur18.filter((s) => manquantesDe(s).length === 0)
console.log(`Sessions terminées sur 18 mois : ${sur18.length}`)
console.log(`  dossiers complets   : ${completes.length}`)
console.log(`  dossiers incomplets : ${candidats.length}\n`)

// Les quatre pièces les plus absentes se saisissent dans le CRM, sans courir
// après un document : c'est là que l'heure investie rapporte le plus.
const SAISISSABLE = new Set(['positionnement', 'acquis', 'satisfaction', 'emargement'])
const bouclablesEnSaisie = candidats.filter((c) => c.manquantes.every((p) => SAISISSABLE.has(p.cle)))
console.log(`Dossiers qu'une saisie dans le CRM suffirait à boucler : ${bouclablesEnSaisie.length}`)
const recents = bouclablesEnSaisie.filter((c) => c.age <= 12)
console.log(`  dont sur les 12 derniers mois : ${recents.length}\n`)

const parNb = {}
for (const c of candidats) parNb[c.manquantes.length] = (parNb[c.manquantes.length] || 0) + 1
console.log('Réparties par nombre de pièces absentes :')
for (const n of Object.keys(parNb).sort()) console.log(`   ${n} pièce(s) manquante(s) : ${parNb[n]} dossier(s)`)

console.log('\n── Les 25 dossiers les plus vite bouclés ──\n')
for (const c of candidats.slice(0, 25)) {
  const s = c.s
  const client = s.client?.raison_sociale || '—'
  console.log(`${String(s.reference || '').padEnd(16)} ${(s.date_fin || s.date_debut)}  ${client.slice(0, 26).padEnd(27)} ${c.manquantes.map((p) => p.label).join(', ')}`)
}

// Ce qui manque le plus souvent : c'est là que l'effort paie le mieux.
const freq = {}
for (const c of candidats) for (const p of c.manquantes) freq[p.label] = (freq[p.label] || 0) + 1
console.log('\n── Pièce la plus souvent absente ──')
for (const [k, v] of Object.entries(freq).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(4)}  ${k}`)
