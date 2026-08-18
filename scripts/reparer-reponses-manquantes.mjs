#!/usr/bin/env node
/**
 * Réparation des lignes de réponses questionnaires perdues (purge du 18/08 :
 * la sauvegarde avait plafonné à 1000 lignes par requête sur qcm_reponses).
 *
 * PRINCIPE : pour chaque questionnaire rattaché à une session
 * (qcm_sessions) et chaque stagiaire inscrit, il doit exister une ligne
 * qcm_reponses. Celles qui manquent sont recréées EN ATTENTE (is_complete
 * false, sans score) : aucun résultat n'est inventé — les résultats papier
 * se ressaisissent par la saisie rapide, comme pour n'importe quel
 * questionnaire non encore reporté.
 *
 * USAGE : node scripts/reparer-reponses-manquantes.mjs           (simulation)
 *         node scripts/reparer-reponses-manquantes.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'

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

const [qcmSessions, reponses, inscriptions] = await Promise.all([
  tout('qcm_sessions', 'id, qcm_id, session_id'),
  tout('qcm_reponses', 'qcm_id, session_id, apprenant_id'),
  tout('inscriptions', 'session_id, apprenant_id'),
])

const dejaLa = new Set(reponses.map((r) => `${r.qcm_id}|${r.session_id}|${r.apprenant_id}`))
const inscritsParSession = new Map()
for (const i of inscriptions) {
  if (!inscritsParSession.has(i.session_id)) inscritsParSession.set(i.session_id, [])
  inscritsParSession.get(i.session_id).push(i.apprenant_id)
}

const aCreer = []
for (const qs of qcmSessions) {
  for (const apprenantId of inscritsParSession.get(qs.session_id) || []) {
    const cle = `${qs.qcm_id}|${qs.session_id}|${apprenantId}`
    if (dejaLa.has(cle)) continue
    dejaLa.add(cle)
    aCreer.push({
      organization_id: ORG,
      qcm_id: qs.qcm_id,
      session_id: qs.session_id,
      apprenant_id: apprenantId,
      is_complete: false,
    })
  }
}

console.log(`Lignes de réponse manquantes (questionnaire rattaché + stagiaire inscrit) : ${aCreer.length}`)
if (ECRIRE && aCreer.length) {
  let ok = 0
  for (let i = 0; i < aCreer.length; i += 100) {
    const { error } = await supabase.from('qcm_reponses').insert(aCreer.slice(i, i + 100))
    if (error) console.error('  !!', error.message.slice(0, 90))
    else ok += Math.min(100, aCreer.length - i)
  }
  console.log(`APPLIQUÉ — ${ok} lignes recréées en attente de saisie.`)
} else if (aCreer.length) console.log('Relancer avec --ecrire.')
