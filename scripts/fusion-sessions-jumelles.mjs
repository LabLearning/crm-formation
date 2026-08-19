#!/usr/bin/env node
/**
 * Fusion des sessions jumelles révélées par la fusion des clients (19/08).
 *
 * Une jumelle = même client, même date, MÊME formation et stagiaires en
 * commun — la même prestation créée deux fois (import Dendreo + saisie
 * manuelle, ou double fiche client). Les grappes « deux formations
 * différentes le même jour » et « même formation mais groupes disjoints »
 * sont des prestations réelles : PAS touchées.
 *
 * La session gardée est celle qui porte le plus de réponses complétées ;
 * les satellites du doublon migrent (inscriptions et questionnaires
 * dédupliqués — la ligne complétée gagne, l'émargement signé ne disparaît
 * jamais), puis le doublon part, sauvegardé dans backups/.
 *
 *   node scripts/fusion-sessions-jumelles.mjs           (simulation)
 *   node scripts/fusion-sessions-jumelles.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Paires validées à la main depuis le scan du 19/08 : [référence affichée, id court gardé, ids courts absorbés]
const FUSIONS = [
  { nom: 'VBI 01/08', garde: 'POEI-2026-506', absorbe: ['65220fa9'] },
  { nom: 'VBI 10/08', garde: '3b208403', absorbe: ['2a781e67'], gardePar: 'id' },
  { nom: 'FOCH 12/08', garde: 'c117cbc2', absorbe: [], gardePar: 'id' }, // résolu ci-dessous : POEI-2026-507 existe en double
  { nom: 'CHICKEEZ 22/07', garde: 'POEI-2026-408', absorbe: ['03a13656'] },
  { nom: 'LES LILAS 29/09', garde: 'ADF_20250169', absorbe: ['ADF_20250134'] },
  { nom: 'LUNEL CROUST 11/05', garde: 'ADF_20260212', absorbe: ['SES-2026-443'] },
  { nom: 'NST 36 22/06', garde: 'POEI-2026-485', absorbe: ['ADF_20260271'] },
]

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

const sessions = await tout('sessions', 'id, reference, client_id, date_debut')
const trouver = (cle) => sessions.filter((s) => s.reference === cle || s.id.startsWith(cle))

// Cas particulier : deux sessions portent la référence POEI-2026-507 (VBI et
// FOCH). Pour VBI 10/08 la gardée est celle de VBI ; pour FOCH celle de FOCH.
const p507 = sessions.filter((s) => s.reference === 'POEI-2026-507')
const vbi10 = trouver('3b208403')[0]
const foch = trouver('c117cbc2')[0]
const plan = []
for (const f of FUSIONS) {
  const garde = trouver(f.garde)[0]
  if (!garde) { console.log(`  introuvable : ${f.garde}`); continue }
  const absorbe = f.absorbe.map((a) => trouver(a)[0]).filter(Boolean).filter((s) => s.id !== garde.id)
  plan.push({ nom: f.nom, garde, absorbe })
}
// POEI-2026-507 : celle du client de VBI absorbe VBI 10/08 ? Non — la gardée
// est la session la plus remplie ; ici la 507 de chaque client s'absorbe
// dans la session native du même client (grilles déjà remplies dessus).
for (const s of p507) {
  if (vbi10 && s.client_id === vbi10.client_id) plan.find((p) => p.nom === 'VBI 10/08')?.absorbe.push(s)
  if (foch && s.client_id === foch.client_id) plan.find((p) => p.nom === 'FOCH 12/08')?.absorbe.push(s)
}

// Nombre de réponses complétées : la session la plus documentée est gardée.
const completude = async (id) => {
  const { count } = await supabase.from('qcm_reponses').select('id', { count: 'exact', head: true }).eq('session_id', id).eq('is_complete', true)
  return count || 0
}

const SATELLITES_SIMPLES = ['session_formations', 'session_deroule_etapes', 'recueils_besoin', 'emargement_feuilles', 'incidents', 'conventions', 'documents', 'contrats_formateur', 'certificat_signatures', 'taches_formateur', 'pointages_formateur', 'demandes_changement_participants', 'dossiers_formation', 'poei', 'poei_mandats', 'evaluations_satisfaction', 'evaluations_acquis', 'evaluations_apprenant', 'factures', 'factures_formateur', 'appreciations_parties_prenantes', 'lead_formations', 'audits_etablissement', 'limova_appels', 'devis']

for (const p of plan) {
  if (!p.absorbe.length) continue
  // arbitrage garde/absorbe par complétude réelle
  const tous = [p.garde, ...p.absorbe]
  const scores = await Promise.all(tous.map((s) => completude(s.id)))
  const idx = scores.indexOf(Math.max(...scores))
  const garde = tous[idx]
  const absorbe = tous.filter((_, i) => i !== idx)
  console.log(`  ${p.nom} : garde ${garde.reference || garde.id.slice(0, 8)} (${scores[idx]} rép. complètes), absorbe ${absorbe.map((s, i) => (s.reference || s.id.slice(0, 8))).join(', ')}`)
  if (!ECRIRE) continue

  for (const d of absorbe) {
    // inscriptions : re-pointées sauf déjà inscrites
    const { data: insc } = await supabase.from('inscriptions').select('id, apprenant_id').eq('session_id', d.id)
    for (const i of insc || []) {
      const { data: deja } = await supabase.from('inscriptions').select('id').eq('session_id', garde.id).eq('apprenant_id', i.apprenant_id).maybeSingle()
      if (deja) await supabase.from('inscriptions').delete().eq('id', i.id)
      else await supabase.from('inscriptions').update({ session_id: garde.id }).eq('id', i.id)
    }
    // qcm_sessions : re-pointés sauf même qcm déjà rattaché
    const { data: liens } = await supabase.from('qcm_sessions').select('id, qcm_id').eq('session_id', d.id)
    for (const l of liens || []) {
      const { data: deja } = await supabase.from('qcm_sessions').select('id').eq('session_id', garde.id).eq('qcm_id', l.qcm_id).maybeSingle()
      if (deja) await supabase.from('qcm_sessions').delete().eq('id', l.id)
      else await supabase.from('qcm_sessions').update({ session_id: garde.id }).eq('id', l.id)
    }
    // qcm_reponses : la complétée gagne
    const { data: reps } = await supabase.from('qcm_reponses').select('id, qcm_id, apprenant_id, is_complete').eq('session_id', d.id)
    for (const r of reps || []) {
      const { data: deja } = await supabase.from('qcm_reponses').select('id, is_complete').eq('session_id', garde.id).eq('qcm_id', r.qcm_id).eq('apprenant_id', r.apprenant_id).maybeSingle()
      if (!deja) await supabase.from('qcm_reponses').update({ session_id: garde.id }).eq('id', r.id)
      else if (r.is_complete && !deja.is_complete) {
        await supabase.from('qcm_reponses').delete().eq('id', deja.id)
        await supabase.from('qcm_reponses').update({ session_id: garde.id }).eq('id', r.id)
      } else await supabase.from('qcm_reponses').delete().eq('id', r.id)
    }
    // émargements : le signé gagne, jamais de perte silencieuse
    const { data: ems } = await supabase.from('emargements').select('id, apprenant_id, date, creneau, signature_data').eq('session_id', d.id)
    for (const e of ems || []) {
      const { data: deja } = await supabase.from('emargements').select('id, signature_data').eq('session_id', garde.id).eq('apprenant_id', e.apprenant_id).eq('date', e.date).eq('creneau', e.creneau).maybeSingle()
      if (!deja) await supabase.from('emargements').update({ session_id: garde.id }).eq('id', e.id)
      else if (e.signature_data && !deja.signature_data) {
        await supabase.from('emargements').delete().eq('id', deja.id)
        await supabase.from('emargements').update({ session_id: garde.id }).eq('id', e.id)
      } else await supabase.from('emargements').delete().eq('id', e.id)
    }
    // le reste re-pointe directement (le recueil du doublon part : la gardée a le sien)
    await supabase.from('recueils_besoin').delete().eq('session_id', d.id)
    for (const table of SATELLITES_SIMPLES.filter((t) => t !== 'recueils_besoin')) {
      const { error } = await supabase.from(table).update({ session_id: garde.id }).eq('session_id', d.id)
      if (error && !/does not exist|Could not find/.test(error.message)) console.error(`    !! ${table}: ${error.message.slice(0, 70)}`)
    }
    const { error } = await supabase.from('sessions').delete().eq('id', d.id)
    if (error) console.log(`    ${d.reference || d.id.slice(0, 8)} conservée : ${error.message.slice(0, 70)}`)
  }
}
console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION — relancer avec --ecrire'}`)
