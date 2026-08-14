#!/usr/bin/env node
// Mesure temporaire — lecture seule. Indicateur 4 : date recueil vs convention.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const pages = async (fn) => { const o = []; for (let f = 0; ; f += 500) { const { data, error } = await fn(f, f + 499); if (error) throw new Error(error.message); o.push(...(data || [])); if ((data || []).length < 500) break } return o }

const [recueils, conventions, devis, sessions] = await Promise.all([
  pages((f, t) => supabase.from('recueils_besoin').select('id, session_id, statut, date_recueil, created_at').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('conventions').select('id, numero, session_id, devis_id, dossier_id, status, signature_client_date, signature_of_date, date_emission, created_at').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('devis').select('id, numero, client_id, formation_id, dossier_id, status, date_emission, date_acceptation, sent_at, created_at').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('sessions').select('id, reference, date_debut, client_id, formation_id, status').eq('organization_id', ORG).range(f, t)),
])
console.log(`recueils=${recueils.length} conventions=${conventions.length} devis=${devis.length} sessions=${sessions.length}`)

const recueilParSession = new Map()
for (const r of recueils) if (r.session_id) {
  const ex = recueilParSession.get(r.session_id)
  if (!ex || (r.date_recueil || '') < (ex.date_recueil || '')) recueilParSession.set(r.session_id, r)
}
console.log(`recueils avec session_id: ${recueils.filter(r => r.session_id).length}, sessions distinctes: ${recueilParSession.size}`)
console.log(`recueils sans date_recueil: ${recueils.filter(r => !r.date_recueil).length}`)
console.log(`statuts recueils:`, Object.entries(recueils.reduce((a, r) => (a[r.statut] = (a[r.statut] || 0) + 1, a), {})))

const devisParId = new Map(devis.map(d => [d.id, d]))
const devisParDossier = new Map()
for (const d of devis) if (d.dossier_id) devisParDossier.set(d.dossier_id, d)
const sessParId = new Map(sessions.map(s => [s.id, s]))

// Date de référence de la convention : signature client, sinon émission, sinon created_at
const dateConv = (c) => c.signature_client_date || c.date_emission || (c.created_at || '').slice(0, 10)
const refConv = (c) => c.signature_client_date ? 'signature' : c.date_emission ? 'emission' : 'created_at'

let conforme = 0, egal = 0, ecart = 0, sansDate = 0, sansRecueil = 0
const detailsEcart = [], detailsSansRecueil = []
const convParSession = new Map()
for (const c of conventions) if (c.session_id && !convParSession.has(c.session_id)) convParSession.set(c.session_id, c)

for (const [sid, c] of convParSession) {
  const r = recueilParSession.get(sid)
  const dc = dateConv(c)
  const s = sessParId.get(sid)
  if (!r) { sansRecueil++; detailsSansRecueil.push(`${c.numero} [${c.status}] conv=${dc}(${refConv(c)}) session=${s?.reference || sid} debut=${s?.date_debut}`); continue }
  if (!r.date_recueil) { sansDate++; continue }
  if (r.date_recueil < dc) conforme++
  else if (r.date_recueil === dc) { egal++; detailsEcart.push(`EGAL  ${c.numero} [${c.status}] recueil=${r.date_recueil} conv=${dc}(${refConv(c)}) session=${s?.reference} debut=${s?.date_debut} devis_id=${c.devis_id ? 'oui' : 'non'}`) }
  else { ecart++
    const d = c.devis_id ? devisParId.get(c.devis_id) : (c.dossier_id ? devisParDossier.get(c.dossier_id) : null)
    const dd = d ? (d.date_emission || (d.created_at || '').slice(0, 10)) : null
    detailsEcart.push(`APRES ${c.numero} [${c.status}] recueil=${r.date_recueil} conv=${dc}(${refConv(c)}) session=${s?.reference} debut=${s?.date_debut} devis=${d ? `${d.numero} emis=${dd} ${dd < dc ? 'ANTERIEUR' : 'posterieur'}` : 'aucun'}`)
  }
}
console.log(`\nSessions avec convention: ${convParSession.size}`)
console.log(`  recueil AVANT convention (conforme): ${conforme}`)
console.log(`  recueil = date convention (limite): ${egal}`)
console.log(`  recueil APRES convention (ecart): ${ecart}`)
console.log(`  recueil sans date exploitable: ${sansDate}`)
console.log(`  convention SANS recueil: ${sansRecueil}`)
console.log(`\n--- Details ecarts/egaux ---`)
detailsEcart.forEach(l => console.log(l))
console.log(`\n--- Conventions sans recueil ---`)
detailsSansRecueil.forEach(l => console.log(l))

// Liens devis disponibles sur les conventions
console.log(`\nConventions avec devis_id: ${conventions.filter(c => c.devis_id).length}/${conventions.length}, avec dossier_id: ${conventions.filter(c => c.dossier_id).length}`)
console.log(`Devis avec dossier_id: ${devis.filter(d => d.dossier_id).length}/${devis.length}`)
// Correspondance possible devis -> session via client+formation ?
let viaCF = 0
for (const [sid, c] of convParSession) {
  const s = sessParId.get(sid)
  if (s && devis.some(d => d.client_id === s.client_id && d.formation_id === s.formation_id)) viaCF++
}
console.log(`Conventions dont la session matche un devis par client+formation: ${viaCF}`)
