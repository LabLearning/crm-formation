/**
 * Recalcule le score des réponses dont le questionnaire n'a aucune bonne
 * réponse définie : elles affichaient 0 %, ce qui se lit comme un échec alors
 * qu'il n'y avait rien à réussir.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf8')
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1], env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1])
const ORG='ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')
const all=async(fn)=>{const o=[];let f=0;for(;;){const{data,error}=await fn(f,f+999);if(error)throw new Error(error.message);o.push(...(data||[]));if(!data||data.length<1000)break;f+=1000}return o}

const questions = await all((f,t)=>supabase.from('qcm_questions').select('id, qcm_id, type').range(f,t))
const choix = await all((f,t)=>supabase.from('qcm_choix').select('question_id, est_correct').range(f,t))
const bonnes = new Set(choix.filter(c=>c.est_correct).map(c=>c.question_id))
const notable = new Set(questions.filter(q=>bonnes.has(q.id)).map(q=>q.qcm_id))
const plafond = new Map(questions.map(q=>[q.id, q.type==='note_1_5'?5:(q.type==='note_1_10'||q.type==='nps')?10:0]))

const rep = await all((f,t)=>supabase.from('qcm_reponses').select('id, qcm_id, score').eq('organization_id',ORG).eq('is_complete',true).range(f,t))
const concernees = rep.filter(r=>!notable.has(r.qcm_id))
console.log(`Reponses completees : ${rep.length}`)
console.log(`Dont questionnaire sans bonne reponse : ${concernees.length}`)

const details = await all((f,t)=>supabase.from('qcm_reponses_detail').select('reponse_id, question_id, note_valeur').range(f,t))
const parReponse = new Map()
for (const d of details) { if(!parReponse.has(d.reponse_id)) parReponse.set(d.reponse_id,[]); parReponse.get(d.reponse_id).push(d) }

const maj = []
for (const r of concernees) {
  let cumul=0, max=0
  for (const d of parReponse.get(r.id)||[]) {
    const p = plafond.get(d.question_id) || 0
    if (p && d.note_valeur != null) { cumul += Number(d.note_valeur); max += p }
  }
  const nouveau = max > 0 ? Math.round((cumul/max)*100) : null
  if (nouveau !== r.score) maj.push({ id: r.id, score: nouveau })
}
const versNull = maj.filter(m=>m.score===null).length
console.log(`A corriger : ${maj.length}   (dont ${versNull} sans note calculable -> score vide)`)
if (!ECRIRE) { console.log('\n--- SIMULATION, relancer avec --ecrire ---'); process.exit(0) }
for (const m of maj) {
  await supabase.from('qcm_reponses').update({ score: m.score, score_points: null, score_total: null, is_reussi: null }).eq('id', m.id)
}
console.log('Corrige.')
