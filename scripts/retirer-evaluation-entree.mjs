/**
 * Retire l'évaluation diagnostique d'entrée du parcours.
 *
 * Le parcours retenu est : positionnement → évaluation des acquis →
 * satisfaction à chaud → satisfaction à froid. Le type « entree » faisait
 * doublon avec le positionnement et n'est plus rattaché aux nouvelles
 * sessions ; restait l'héritage, qui encombre les fiches et fausse les
 * compteurs de complétude.
 *
 * Ce qui est supprimé : les lignes de réponse vides et les rattachements
 * devenus sans objet. Les questionnaires eux-mêmes sont archivés plutôt que
 * détruits — ils portent des questions rédigées, et rien n'oblige à les
 * perdre.
 *
 * Ce qui est conservé : les réponses réellement complétées. Elles sont
 * reclassées vers le questionnaire de positionnement de la même formation —
 * c'est le même acte pédagogique sous un autre nom. Le détail des réponses
 * reste rattaché aux questions d'origine, préservées puisque les
 * questionnaires sont archivés et non détruits.
 *
 *   node scripts/retirer-evaluation-entree.mjs           (simulation)
 *   node scripts/retirer-evaluation-entree.mjs --ecrire
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

const qcms = await pages((f, t) => supabase.from('qcm')
  .select('id, titre, status').eq('organization_id', ORG).eq('type', 'entree').range(f, t))
const idsEntree = new Set(qcms.map((q) => q.id))

const reponses = (await pages((f, t) => supabase.from('qcm_reponses')
  .select('id, qcm_id, session_id, is_complete').eq('organization_id', ORG).range(f, t)))
  .filter((r) => idsEntree.has(r.qcm_id))

const vides = reponses.filter((r) => !r.is_complete)
const remplies = reponses.filter((r) => r.is_complete)

// ── Reclassement des réponses remplies vers le positionnement ──────────────
// On passe par la formation : chaque session pointe une formation, qui a son
// questionnaire de positionnement.
const sessionsConcernees = [...new Set(remplies.map((r) => r.session_id))].filter(Boolean)
const sessions = sessionsConcernees.length
  ? (await supabase.from('sessions').select('id, reference, formation_id').in('id', sessionsConcernees)).data || []
  : []
const formationDe = new Map(sessions.map((s) => [s.id, s.formation_id]))

const positionnements = (await pages((f, t) => supabase.from('qcm')
  .select('id, formation_id').eq('organization_id', ORG).eq('type', 'positionnement').range(f, t)))
const positionnementDe = new Map(positionnements.filter((q) => q.formation_id).map((q) => [q.formation_id, q.id]))

const tousLiens = await pages((f, t) => supabase.from('qcm_sessions').select('id, qcm_id, session_id').range(f, t))
const lienExistant = new Map(tousLiens.map((l) => [`${l.session_id}|${l.qcm_id}`, l.id]))

// Un apprenant qui a déjà répondu au positionnement de sa session ne doit pas
// se retrouver avec deux réponses : on ne reclasse pas dans ce cas.
const dejaPositionne = new Set(
  (await pages((f, t) => supabase.from('qcm_reponses')
    .select('session_id, apprenant_id, qcm_id').eq('organization_id', ORG).range(f, t)))
    .filter((r) => positionnements.some((q) => q.id === r.qcm_id))
    .map((r) => `${r.session_id}|${r.apprenant_id}`),
)

const aReclasser = []
const nonReclassables = []
for (const r of remplies) {
  const cible = positionnementDe.get(formationDe.get(r.session_id))
  const ref = sessions.find((s) => s.id === r.session_id)?.reference || r.session_id
  if (!cible) { nonReclassables.push(`${ref} — pas de questionnaire de positionnement sur la formation`); continue }
  if (dejaPositionne.has(`${r.session_id}|${r.apprenant_id}`)) {
    nonReclassables.push(`${ref} — le stagiaire a déjà un positionnement`); continue
  }
  aReclasser.push({ ...r, cible, ref })
}

// Un rattachement ne se supprime que si plus aucune réponse remplie n'en dépend.
const sessionsAGarder = new Set(remplies.filter((r) => !aReclasser.some((x) => x.id === r.id)).map((r) => r.session_id))
const liens = tousLiens.filter((l) => idsEntree.has(l.qcm_id))
const liensASupprimer = liens.filter((l) => !sessionsAGarder.has(l.session_id))

console.log(`Questionnaires « entree »          : ${idsEntree.size}`)
console.log(`Réponses vides à supprimer         : ${vides.length}`)
console.log(`Réponses remplies                  : ${remplies.length}`)
console.log(`  reclassées en positionnement     : ${aReclasser.length}`)
console.log(`  laissées en place                : ${nonReclassables.length}`)
for (const m of nonReclassables) console.log(`      ${m}`)
console.log(`Rattachements à supprimer          : ${liensASupprimer.length} / ${liens.length}`)
console.log(`Questionnaires à archiver          : ${qcms.filter((q) => q.status !== 'archive').length}`)

if (!ECRIRE) {
  console.log('\n--- SIMULATION, rien n\'a été écrit. Relancer avec --ecrire ---')
  process.exit(0)
}

const parLots = async (ids, fn, libelle) => {
  let n = 0
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await fn(ids.slice(i, i + 200))
    if (error) { console.error(`ERREUR ${libelle} :`, error.message); process.exit(1) }
    n += Math.min(200, ids.length - i)
  }
  console.log(`  ${libelle} : ${n}`)
}

console.log('\nÉcriture…')

// Reclassement d'abord : les rattachements « entree » qu'il libère pourront
// être supprimés ensuite.
let reclasses = 0
for (const r of aReclasser) {
  let lien = lienExistant.get(`${r.session_id}|${r.cible}`)
  if (!lien) {
    const { data } = await supabase.from('qcm_sessions')
      .insert({ session_id: r.session_id, qcm_id: r.cible }).select('id').single()
    lien = data?.id || null
    if (lien) lienExistant.set(`${r.session_id}|${r.cible}`, lien)
  }
  const { error } = await supabase.from('qcm_reponses')
    .update({ qcm_id: r.cible, qcm_session_id: lien }).eq('id', r.id)
  if (error) { console.error('ERREUR reclassement', r.ref, error.message); process.exit(1) }
  reclasses++
}
console.log(`  réponses reclassées en positionnement : ${reclasses}`)
// Le détail des réponses part avec elles (contrainte ON DELETE CASCADE).
await parLots(vides.map((r) => r.id),
  (ids) => supabase.from('qcm_reponses').delete().in('id', ids), 'réponses vides supprimées')
await parLots(liensASupprimer.map((l) => l.id),
  (ids) => supabase.from('qcm_sessions').delete().in('id', ids), 'rattachements supprimés')
await parLots([...idsEntree],
  (ids) => supabase.from('qcm').update({ status: 'archive' }).in('id', ids), 'questionnaires archivés')

console.log('\nTerminé.')
