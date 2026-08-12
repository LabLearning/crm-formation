/**
 * Redate les constats de dossier incomplet au jour de la session.
 *
 * `date_incident` porte la date du dysfonctionnement — le jour où la pièce
 * aurait dû être recueillie — et non celle du constat. Les deux coexistent :
 * la description dit quand l'inventaire a été fait, et `created_at` en garde
 * la trace en base. Rien n'est antidaté : ce qui est déplacé, c'est la date
 * de l'événement, pas celle de son enregistrement.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf8')
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1], env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1])
const ORG='ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')
// Le réseau lâche parfois sur les grosses pages : on réessaie plutôt que
// d'abandonner un traitement à moitié fait.
const tenter = async (fn, essais = 4) => {
  for (let i = 0; i < essais; i++) {
    try {
      const { data, error } = await fn()
      if (error) throw new Error(error.message)
      return data || []
    } catch (e) {
      if (i === essais - 1) throw e
      await new Promise((ok) => setTimeout(ok, 1500 * (i + 1)))
    }
  }
}
const all = async (fn) => {
  const o = []; let f = 0
  for (;;) {
    const d = await tenter(() => fn(f, f + 499))
    o.push(...d)
    if (d.length < 500) break
    f += 500
  }
  return o
}

const inc = await all((f,t)=>supabase.from('incidents')
  .select('id, session_id, date_incident').eq('organization_id',ORG).eq('type','documentaire').range(f,t))
const ids=[...new Set(inc.map(i=>i.session_id).filter(Boolean))]
// Un `in()` de 481 identifiants fait une URL de 18 ko que le serveur refuse :
// on interroge par paquets.
const ses = []
for (let i = 0; i < ids.length; i += 80) {
  ses.push(...await tenter(() => supabase.from('sessions')
    .select('id, date_debut, date_fin').in('id', ids.slice(i, i + 80))))
}
const finDe = new Map(ses.map(s=>[s.id, s.date_fin || s.date_debut]))

const maj = inc.filter(i => finDe.get(i.session_id) && i.date_incident !== finDe.get(i.session_id))
console.log(`Constats documentaires : ${inc.length}`)
console.log(`A redater au jour de la session : ${maj.length}`)
if (!ECRIRE) { console.log('\n--- SIMULATION, relancer avec --ecrire ---'); process.exit(0) }

for (let i=0;i<maj.length;i+=100) {
  await Promise.all(maj.slice(i,i+100).map(x =>
    supabase.from('incidents').update({ date_incident: finDe.get(x.session_id) }).eq('id', x.id)))
}
console.log('Redates.')
