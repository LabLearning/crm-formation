#!/usr/bin/env node
/**
 * Fusion des stagiaires en double dans une même session.
 *
 * Cas détecté : une même personne inscrite sous deux fiches apprenant dans la
 * même session (créées le même jour — double saisie). La fiche GARDÉE est
 * celle qui a l'historique le plus riche (autres sessions, réponses
 * complétées) ; tout ce que portait l'autre (émargements, réponses,
 * évaluations) est re-pointé dessus, puis l'inscription en double et la
 * fiche orpheline sont supprimées.
 *
 * Règle émargement (source unique) : un émargement n'est jamais perdu — il
 * change de fiche, il ne disparaît pas.
 *
 * USAGE : node scripts/fusion-stagiaires-doublons.mjs           (simulation)
 *         node scripts/fusion-stagiaires-doublons.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Tables avec apprenant_id à re-pointer (hors inscriptions et qcm_reponses,
// traitées à part pour gérer les doublons de couples).
const A_REPOINTER = ['emargements', 'evaluations_apprenant', 'evaluations_acquis', 'certificat_signatures', 'documents', 'poei_candidats', 'demandes_changement_participants']

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
const norm = (a) => `${a?.prenom || ''} ${a?.nom || ''}`.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim()

const [insc, apprenants, sessions] = await Promise.all([
  tout('inscriptions', 'id, session_id, apprenant_id'),
  tout('apprenants', 'id, prenom, nom, client_id'),
  tout('sessions', 'id, reference, client_id'),
])
const refS = new Map(sessions.map((x) => [x.id, x.reference || x.id.slice(0, 8)]))
const app = new Map(apprenants.map((a) => [a.id, a]))
const inscParApprenant = new Map()
for (const i of insc) inscParApprenant.set(i.apprenant_id, (inscParApprenant.get(i.apprenant_id) || 0) + 1)

// Paires : même nom + même client (directement sur la fiche, ou via les
// sessions où la personne est inscrite). Couvre les doublons dans une même
// session ET les fiches recréées d'une session à l'autre (cas CT DIJON).
const sessClient = new Map(sessions.map((x) => [x.id, x.client_id]))
const clientsDe = (aid) => {
  const set = new Set()
  const fiche = app.get(aid)
  if (fiche?.client_id) set.add(fiche.client_id)
  for (const i of insc) if (i.apprenant_id === aid && sessClient.get(i.session_id)) set.add(sessClient.get(i.session_id))
  return set
}
const parNom = new Map()
for (const a of apprenants) {
  const n = norm(a)
  if (!n) continue
  if (!parNom.has(n)) parNom.set(n, [])
  parNom.get(n).push(a.id)
}
const paires = []
for (const [nom, fiches] of parNom) {
  if (fiches.length < 2) continue
  for (let i = 0; i < fiches.length; i++) for (let j = i + 1; j < fiches.length; j++) {
    const ca = clientsDe(fiches[i]), cb = clientsDe(fiches[j])
    if (![...ca].some((c) => cb.has(c))) continue
    const ia = insc.find((x) => x.apprenant_id === fiches[i])
    const ib = insc.find((x) => x.apprenant_id === fiches[j])
    paires.push({ nom, a: { apprenant_id: fiches[i], id: ia?.id }, b: { apprenant_id: fiches[j], id: ib?.id }, session_id: ia?.session_id })
  }
}

console.log(`Paires détectées : ${paires.length}`)
for (const p of paires) {
  // La fiche gardée : la plus rattachée ailleurs (inscriptions au total).
  const [garde, doublon] = (inscParApprenant.get(p.a.apprenant_id) || 0) >= (inscParApprenant.get(p.b.apprenant_id) || 0)
    ? [p.a, p.b] : [p.b, p.a]
  console.log(`  ${refS.get(p.session_id)}  ${p.nom} : garde ${garde.apprenant_id.slice(0, 8)}, fusionne ${doublon.apprenant_id.slice(0, 8)}`)
  if (!ECRIRE) continue

  // 1. Re-pointer les satellites du doublon vers la fiche gardée. Ligne à
  //    ligne : une collision d'unicité (le gardé a déjà son créneau) ne doit
  //    pas faire échouer tout le lot — la ligne signée gagne, le doublon
  //    non signé s'efface.
  for (const table of A_REPOINTER) {
    const { data: lignes, error: e0 } = await supabase.from(table).select('id').eq('apprenant_id', doublon.apprenant_id)
    if (e0) { if (!/does not exist/.test(e0.message)) console.error(`    !! ${table}: ${e0.message.slice(0, 70)}`); continue }
    for (const l of lignes || []) {
      const { error } = await supabase.from(table).update({ apprenant_id: garde.apprenant_id }).eq('id', l.id)
      if (error && /duplicate key/.test(error.message)) {
        await supabase.from(table).delete().eq('id', l.id).is('signature_data', null).catch?.(() => {})
        const { error: e2 } = await supabase.from(table).delete().eq('id', l.id)
        if (e2) console.error(`    !! ${table} (doublon conservé): ${e2.message.slice(0, 60)}`)
      } else if (error) console.error(`    !! ${table}: ${error.message.slice(0, 70)}`)
    }
  }

  // 2. qcm_reponses : re-pointer sauf si la fiche gardée a déjà sa ligne pour
  //    le même questionnaire — la ligne la plus avancée gagne.
  const { data: repDoublon } = await supabase.from('qcm_reponses').select('id, qcm_id, session_id, is_complete').eq('apprenant_id', doublon.apprenant_id)
  for (const r of repDoublon || []) {
    const { data: existante } = await supabase.from('qcm_reponses').select('id, is_complete')
      .eq('apprenant_id', garde.apprenant_id).eq('qcm_id', r.qcm_id).eq('session_id', r.session_id).maybeSingle()
    if (!existante) {
      await supabase.from('qcm_reponses').update({ apprenant_id: garde.apprenant_id }).eq('id', r.id)
    } else if (r.is_complete && !existante.is_complete) {
      await supabase.from('qcm_reponses').delete().eq('id', existante.id)
      await supabase.from('qcm_reponses').update({ apprenant_id: garde.apprenant_id }).eq('id', r.id)
    } else {
      await supabase.from('qcm_reponses').delete().eq('id', r.id)
    }
  }

  // 3. Les inscriptions du doublon : re-pointées vers la fiche gardée, sauf
  //    si elle est déjà inscrite à la même session (doublon intra-session).
  const { data: inscDoublon } = await supabase.from('inscriptions').select('id, session_id').eq('apprenant_id', doublon.apprenant_id)
  for (const i of inscDoublon || []) {
    const { data: deja } = await supabase.from('inscriptions').select('id')
      .eq('session_id', i.session_id).eq('apprenant_id', garde.apprenant_id).maybeSingle()
    if (deja) await supabase.from('inscriptions').delete().eq('id', i.id)
    else await supabase.from('inscriptions').update({ apprenant_id: garde.apprenant_id }).eq('id', i.id)
  }
  const { count: reste } = await supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('apprenant_id', doublon.apprenant_id)
  if (!reste) {
    const { error } = await supabase.from('apprenants').delete().eq('id', doublon.apprenant_id)
    if (error) console.log(`    fiche ${doublon.apprenant_id.slice(0, 8)} conservée (référencée ailleurs : ${error.message.slice(0, 60)})`)
    else console.log(`    fiche orpheline ${doublon.apprenant_id.slice(0, 8)} supprimée`)
  }
}
console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${paires.length} fusions${ECRIRE ? '' : '. Relancer avec --ecrire.'}`)
