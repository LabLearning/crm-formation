#!/usr/bin/env node
/**
 * Création des sessions de la matrice absentes du CRM — décision 18/08/2026 :
 * « toutes les sessions OPCO doivent être sur le CRM ».
 *
 * Source : les lignes de la matrice (dossiers OPCO facturés) sans session en
 * base après croisement. Sont écartées :
 *  - les lignes OPCO EP sans nom de client (impossible à rattacher) ;
 *  - les dossiers POEI par candidat de NST 36 (la session collective existe) ;
 *  - les lignes dont la session existe déjà sous un autre dossier.
 *
 * La session est créée avec les seuls faits de la matrice : n° de dossier en
 * référence, dates, heures, prix facturé, client (rapproché par nom, créé si
 * absent), formation (rapprochée par intitulé — laissée vide si ambiguë).
 * Pas d'inscriptions : les noms des stagiaires ne sont pas dans la matrice.
 *
 * USAGE : node scripts/creer-sessions-matrice.mjs           (simulation)
 *         node scripts/creer-sessions-matrice.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'

config({ path: '.env.local' })
const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ADMIN = '16a538a0-ca4e-42f1-b2a0-354aea73ca46'

const { manquantes } = JSON.parse(readFileSync(
  '/private/tmp/claude-501/-Users-brahimouchrif-Projects-crm-lablearning/04d3a660-0bb5-4829-a5e1-685cc8491e7f/scratchpad/classement.json', 'utf8'))

const norm = (s) => String(s || '').toUpperCase().replace(/Œ/g, 'OE')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(SARL|SAS|SASU|EURL|SA|SNC)\b/g, '').replace(/[^A-Z0-9]/g, '')
const jour = (s) => {
  const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

const [{ data: clients }, { data: formations }, { data: sessions }] = await Promise.all([
  supabase.from('clients').select('id, raison_sociale, nom_commercial').eq('organization_id', ORG).range(0, 9999),
  supabase.from('formations').select('id, intitule, duree_heures').eq('organization_id', ORG).range(0, 9999),
  supabase.from('sessions').select('reference, numero_dossier_opco').range(0, 9999),
])
const refsExistantes = new Set((sessions || []).flatMap((s) => [norm(s.reference), norm(s.numero_dossier_opco)]).filter(Boolean))

let crees = 0
const ecartees = []
// Un même client absent peut porter plusieurs sessions à créer : on ne le
// crée qu'une fois.
const nouveauxClients = new Map()
for (const m of manquantes) {
  // Écartes structurelles
  if (!m.client || m.client === 'null') { ecartees.push(`${m.dossier} — pas de nom de client dans la matrice (${m.financeur})`); continue }
  if (String(m.financeur).startsWith('POEI') && /NST 36/i.test(m.client)) { ecartees.push(`${m.dossier} — dossier par candidat, session NST 36 collective déjà en base`); continue }
  if (refsExistantes.has(norm(m.dossier))) { ecartees.push(`${m.dossier} — déjà en base`); continue }

  const nomN = norm(m.client)
  const client = (clients || []).find((c) => {
    const n1 = norm(c.nom_commercial), n2 = norm(c.raison_sociale)
    return (n1 && (n1.includes(nomN) || nomN.includes(n1))) || (n2 && (n2.includes(nomN) || nomN.includes(n2)))
  }) || null

  // « (MÉTHODES HACCP & PMS) », préfixe POEI… : on cherche le candidat dont
  // l'intitulé recouvre le mieux celui de la matrice, et à défaut le plus
  // court qui matche (le catalogue a des variantes longues par enseigne).
  const formN = norm(String(m.formation || '').replace(/^POEI\s+/i, '').replace(/\(.*?\)/g, '')).replace(/ACCEUIL/g, 'ACCUEIL')
  const candidates = (formations || []).filter((f) => {
    const fn = norm(f.intitule)
    return fn === formN || fn.includes(formN) || formN.includes(fn)
  }).sort((a, b) => Math.abs(norm(a.intitule).length - formN.length) - Math.abs(norm(b.intitule).length - formN.length))
  let formation = candidates[0] || null
  if (!formation && /EMPLOYEPOLYVALENT|EQUIPIERPOLYVALENT/.test(formN)) {
    formation = (formations || []).find((f) => /EQUIPIERPOLYVALENT|EMPLOYEPOLYVALENT/.test(norm(f.intitule))) || null
  }

  console.log(`  ${String(m.dossier).padEnd(15)} ${String(m.client).slice(0, 24).padEnd(26)} ${jour(m.debut) || '—'} → client ${client ? 'OK' : 'À CRÉER'} | formation ${formation ? 'OK' : candidates.length > 1 ? 'AMBIGUË (vide)' : 'INCONNUE (vide)'}`)

  if (ECRIRE) {
    let clientId = client?.id || nouveauxClients.get(nomN)
    if (!clientId) {
      const { data: nc, error } = await supabase.from('clients').insert({
        organization_id: ORG, type: 'entreprise', raison_sociale: m.client, created_by: ADMIN,
      }).select('id').single()
      if (error) { console.error(`  !! client ${m.client}: ${error.message}`); continue }
      clientId = nc.id
      nouveauxClients.set(nomN, clientId)
    }
    const { error } = await supabase.from('sessions').insert({
      organization_id: ORG,
      reference: m.dossier,
      numero_dossier_opco: m.dossier,
      intitule: m.formation || null,
      formation_id: formation?.id || null,
      client_id: clientId,
      date_debut: jour(m.debut),
      date_fin: jour(m.fin) || jour(m.debut),
      status: 'terminee',
      prix_ht: typeof m.facture === 'number' ? m.facture : null,
      places_max: typeof m.stagiaires === 'number' ? m.stagiaires : null,
      notes_internes: `Créée depuis la matrice des dossiers (${m.financeur}) le 18/08/2026 — stagiaires à ressaisir (${m.stagiaires ?? '?'} selon la matrice).`,
      created_by: ADMIN,
    })
    if (error) { console.error(`  !! session ${m.dossier}: ${error.message}`); continue }
    crees++
  }
}

console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${ECRIRE ? crees : 'voir liste'} sessions ; écartées : ${ecartees.length}`)
for (const e of ecartees) console.log(`  · ${e}`)
if (!ECRIRE) console.log('\nRelancer avec --ecrire pour appliquer.')
