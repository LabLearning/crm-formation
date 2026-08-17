#!/usr/bin/env node
/**
 * Recueils du besoin — datation à J-7 du début de session.
 *
 * POURQUOI : le bouton « Marquer comme complété » horodatait au jour du clic.
 * Pour les sessions passées ou imminentes, le recueil se retrouvait daté
 * après la convention voire après le début de la formation — incohérent.
 * La règle : le recueil du besoin est daté 7 jours avant le début de la
 * session, et cette date ne bouge plus ensuite.
 *
 * COMMENT : pour chaque recueil complété rattaché à une session datée, si
 * date_recueil est postérieure à J-7, on la ramène à J-7. Les recueils déjà
 * datés plus tôt que J-7 ne bougent pas (ils sont déjà en amont).
 *
 * USAGE : node scripts/recueils-j7.mjs           (simulation)
 *         node scripts/recueils-j7.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Pagination — le cap PostgREST de 1000 lignes fausserait le tour complet.
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

const recueils = await tout('recueils_besoin', 'id, session_id, statut, date_recueil')
const sessions = await tout('sessions', 'id, reference, date_debut')
const parSession = new Map(sessions.map((s) => [s.id, s]))

let corriges = 0
for (const r of recueils) {
  if (r.statut !== 'complete') continue
  const sess = parSession.get(r.session_id)
  if (!sess?.date_debut) continue
  const j7 = new Date(sess.date_debut)
  j7.setDate(j7.getDate() - 7)
  const cible = j7.toISOString().split('T')[0]
  if (!r.date_recueil || r.date_recueil > cible) {
    corriges++
    console.log(`  ${sess.reference || sess.id.slice(0, 8)}  ${r.date_recueil || '(vide)'} -> ${cible}`)
    if (ECRIRE) {
      const { error } = await supabase.from('recueils_besoin')
        .update({ date_recueil: cible, updated_at: new Date().toISOString() }).eq('id', r.id)
      if (error) console.error(`  !! ${r.id}: ${error.message}`)
    }
  }
}

console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${corriges} recueils ramenés à J-7 sur ${recueils.length}`)
if (!ECRIRE && corriges) console.log('Relancer avec --ecrire pour appliquer.')
