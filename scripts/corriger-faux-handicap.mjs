#!/usr/bin/env node
/**
 * Correction des faux marquages « situation de handicap ».
 *
 * POURQUOI : z.coerce.boolean() transformait la chaîne "false" du formulaire
 * en true — tout apprenant créé ou modifié via le formulaire se retrouvait
 * marqué en situation de handicap. Les recueils du besoin généraient ensuite
 * une réponse nommant ces personnes à tort.
 *
 * COMMENT : le flag n'est retiré que s'il n'est adossé à AUCUN élément
 * concret (ni type de handicap, ni besoins d'adaptation, ni référent
 * contacté). Les réponses handicap des recueils qui nommaient quelqu'un sont
 * ensuite régénérées depuis l'état corrigé.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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

// 1. Faux positifs : flag levé sans aucun élément concret.
const { data: flagges } = await supabase.from('apprenants')
  .select('id, prenom, nom, type_handicap, besoins_adaptation, referent_handicap_contacte')
  .eq('situation_handicap', true)
const faux = flagges.filter((a) =>
  !String(a.type_handicap || '').trim() && !String(a.besoins_adaptation || '').trim() && !a.referent_handicap_contacte)
console.log('flaggés:', flagges.length, '| faux positifs (aucun élément concret):', faux.length)
const ids = faux.map((a) => a.id)
for (let i = 0; i < ids.length; i += 80) {
  const { error } = await supabase.from('apprenants')
    .update({ situation_handicap: false, updated_at: new Date().toISOString() })
    .in('id', ids.slice(i, i + 80))
  if (error) console.error(error.message)
}
console.log('remis à false:', ids.length)

// 2. Recueils dont la réponse handicap nommait quelqu'un : régénérer.
const recueils = await tout('recueils_besoin', 'id, session_id, reponses')
const aReprendre = recueils.filter((r) => String(r.reponses?.handicap || '').includes('déclaré une situation de handicap'))
console.log('recueils nommant un handicap déclaré:', aReprendre.length)

const inscriptions = await tout('inscriptions', 'session_id, apprenant_id')
const { data: encoreFlagges } = await supabase.from('apprenants')
  .select('id, prenom, nom, situation_handicap, besoins_adaptation').eq('situation_handicap', true)
const parApp = new Map((encoreFlagges || []).map((a) => [a.id, a]))
const parSession = new Map()
for (const i of inscriptions) {
  if (!parSession.has(i.session_id)) parSession.set(i.session_id, [])
  const a = parApp.get(i.apprenant_id)
  if (a) parSession.get(i.session_id).push(a)
}

const SANS =
  "Aucun besoin d'adaptation (situation de handicap, langue ou autre) signalé par le commanditaire ni par les participants. " +
  'La possibilité de solliciter le référent handicap de Lab Learning (Sofiane EL OUAHID) a été rappelée — un aménagement reste possible à tout moment de la formation.'

let regen = 0
for (const r of aReprendre) {
  const concernes = parSession.get(r.session_id) || []
  let reponse
  if (!concernes.length) reponse = SANS
  else {
    const details = concernes
      .map((a) => `${a.prenom} ${a.nom}${String(a.besoins_adaptation || '').trim() ? ` (${String(a.besoins_adaptation).trim()})` : ''}`)
      .join(', ')
    reponse =
      `${concernes.length > 1 ? `${concernes.length} participants ont` : '1 participant a'} déclaré une situation de handicap : ${details}. ` +
      "Les besoins d'adaptation sont examinés avec le référent handicap de Lab Learning (Sofiane EL OUAHID) : rythme, supports et modalités d'évaluation ajustables."
  }
  if (reponse !== r.reponses.handicap) {
    regen++
    const { error } = await supabase.from('recueils_besoin')
      .update({ reponses: { ...r.reponses, handicap: reponse }, updated_at: new Date().toISOString() })
      .eq('id', r.id)
    if (error) console.error(error.message)
  }
}
console.log('réponses handicap régénérées:', regen)
const { count } = await supabase.from('apprenants').select('id', { count: 'exact', head: true }).eq('situation_handicap', true)
console.log('restent réellement flaggés:', count)
