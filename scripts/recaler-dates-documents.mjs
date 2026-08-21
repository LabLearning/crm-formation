/**
 * POURQUOI : les pièces rattachées en masse pendant le sprint (supports,
 * conventions collectées, CV…) portent un created_at de mi/fin août 2026 —
 * la date de la saisie, pas celle du document. Partout où cette date
 * s'affiche, elle est incohérente avec la session. On la recale :
 *   1. date extraite du nom de fichier (préfixe YYYY-MM-DD__ du scan mail) ;
 *   2. sinon, début de la session liée (fin de session pour certificats de
 *      réalisation et émargements signés) ;
 *   3. sans repère → on ne touche pas.
 *
 * Simulation par défaut — `--ecrire` pour appliquer.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')
// Fenêtre du sprint de rattachement massif
const DEPUIS = '2026-08-14'

const docs = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('documents')
    .select('id, nom, type, session_id, created_at')
    .eq('organization_id', ORG).gte('created_at', DEPUIS)
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  docs.push(...(data || []))
  if (!data || data.length < 1000) break
}

const sessionIds = [...new Set(docs.map(d => d.session_id).filter(Boolean))]
const sessions = new Map()
for (let i = 0; i < sessionIds.length; i += 100) {
  const { data } = await supabase.from('sessions').select('id, date_debut, date_fin').in('id', sessionIds.slice(i, i + 100))
  for (const s of data || []) sessions.set(s.id, s)
}

const FIN_DE_SESSION = new Set(['certificat_realisation', 'emargement_signe'])
let maj = 0, sansRepere = 0
for (const d of docs) {
  let cible = null
  const m = (d.nom || '').match(/^(\d{4}-\d{2}-\d{2})__/)
  if (m) cible = m[1]
  else if (d.session_id && sessions.has(d.session_id)) {
    const s = sessions.get(d.session_id)
    cible = FIN_DE_SESSION.has(d.type) ? (s.date_fin || s.date_debut) : (s.date_debut || s.date_fin)
  }
  if (!cible || cible >= DEPUIS) { sansRepere++; continue }
  maj++
  if (ECRIRE) {
    const { error } = await supabase.from('documents').update({ created_at: `${cible}T12:00:00Z` }).eq('id', d.id)
    if (error) throw new Error(error.message)
  }
}
console.log(`${docs.length} documents créés depuis le ${DEPUIS} — ${maj} dates recalées, ${sansRepere} sans repère (inchangés)`)
console.log(ECRIRE ? 'ÉCRIT.' : 'Simulation — relancer avec --ecrire')
