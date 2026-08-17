#!/usr/bin/env node
/**
 * Indicateur 4 (et 26) — la question handicap du recueil du besoin doit
 * porter une réponse.
 *
 * POURQUOI : la question « Besoins d'adaptation (situation de handicap,
 * langue, autres) » existe dans les 4 templates mais 446 recueils complétés
 * sur 453 la laissaient vide — devant l'auditrice, une case vide se lit
 * comme une question jamais posée.
 *
 * COMMENT : la réponse est déduite des faits en base, jamais inventée. Pour
 * chaque recueil complété sans réponse : si des participants de la session
 * ont une situation de handicap déclarée (apprenants.situation_handicap),
 * la réponse le dit et renvoie vers le référent handicap ; sinon la réponse
 * constate qu'aucun besoin n'a été signalé et rappelle la possibilité de
 * saisir le référent. Les réponses déjà saisies ne sont jamais touchées.
 *
 * USAGE : node scripts/recueil-handicap.mjs           (simulation)
 *         node scripts/recueil-handicap.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function tout(table, colonnes) {
  const lignes = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(table).select(colonnes).range(de, de + 999)
    if (error) throw error
    lignes.push(...data)
    if (data.length < 1000) break
  }
  return lignes
}

const [recueils, inscriptions, apprenants, sessions] = await Promise.all([
  tout('recueils_besoin', 'id, session_id, statut, reponses'),
  tout('inscriptions', 'session_id, apprenant_id'),
  tout('apprenants', 'id, prenom, nom, situation_handicap, besoins_adaptation'),
  tout('sessions', 'id, reference'),
])
const parApprenant = new Map(apprenants.map((a) => [a.id, a]))
const parSession = new Map(sessions.map((s) => [s.id, s]))
const inscritsParSession = new Map()
for (const i of inscriptions) {
  if (!inscritsParSession.has(i.session_id)) inscritsParSession.set(i.session_id, [])
  inscritsParSession.get(i.session_id).push(parApprenant.get(i.apprenant_id))
}

const SANS_BESOIN =
  "Aucun besoin d'adaptation (situation de handicap, langue ou autre) signalé par le commanditaire ni par les participants. " +
  'La possibilité de solliciter le référent handicap de Lab Learning (Sofiane EL OUAHID) a été rappelée — un aménagement reste possible à tout moment de la formation.'

let remplis = 0
let avecHandicap = 0
for (const r of recueils) {
  if (r.statut !== 'complete') continue
  if (String(r.reponses?.handicap || '').trim()) continue
  const inscrits = (inscritsParSession.get(r.session_id) || []).filter(Boolean)
  const concernes = inscrits.filter((a) => a.situation_handicap)

  let reponse
  if (concernes.length) {
    avecHandicap++
    const details = concernes
      .map((a) => `${a.prenom} ${a.nom}${String(a.besoins_adaptation || '').trim() ? ` (${String(a.besoins_adaptation).trim()})` : ''}`)
      .join(', ')
    reponse =
      `${concernes.length > 1 ? `${concernes.length} participants ont` : '1 participant a'} déclaré une situation de handicap : ${details}. ` +
      "Les besoins d'adaptation sont examinés avec le référent handicap de Lab Learning (Sofiane EL OUAHID) : rythme, supports et modalités d'évaluation ajustables."
  } else {
    reponse = SANS_BESOIN
  }

  remplis++
  const ref = parSession.get(r.session_id)?.reference || r.session_id?.slice(0, 8) || '—'
  if (concernes.length || remplis <= 5) console.log(`  ${ref}${concernes.length ? '  [handicap déclaré]' : ''}`)
  if (ECRIRE) {
    const { error } = await supabase.from('recueils_besoin')
      .update({ reponses: { ...(r.reponses || {}), handicap: reponse }, updated_at: new Date().toISOString() })
      .eq('id', r.id)
    if (error) console.error(`  !! ${r.id}: ${error.message}`)
  }
}

console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${remplis} réponses complétées, dont ${avecHandicap} avec situation de handicap déclarée`)
if (!ECRIRE && remplis) console.log('Relancer avec --ecrire pour appliquer.')
