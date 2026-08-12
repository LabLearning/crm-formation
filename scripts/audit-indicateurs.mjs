#!/usr/bin/env node
/**
 * Balayage des 32 indicateurs du RNQ : ce que le CRM peut réellement produire
 * comme preuve, indicateur par indicateur.
 *
 * Aucun jugement de conformité ici — seulement des chiffres pris dans la base,
 * pour savoir où l'on met l'effort avant l'audit du 17 août.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'

const cpt = async (table, q = (b) => b) => {
  const { count, error } = await q(
    supabase.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', ORG),
  )
  return error ? `ERR ${error.message.slice(0, 60)}` : count
}
/** Sans filtre organisation — pour les tables qui n'en portent pas. */
const cptL = async (table, q = (b) => b) => {
  const { count, error } = await q(supabase.from(table).select('id', { count: 'exact', head: true }))
  return error ? `ERR ${error.message.slice(0, 60)}` : count
}

const R = {}
const jour = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

R.formations = await cpt('formations')
R.formationsPubliees = await cpt('formations', (b) => b.eq('is_active', true))
R.sessions = await cpt('sessions')
R.sessionsTerm = await cpt('sessions', (b) => b.eq('status', 'terminee'))
R.sessions12m = await cpt('sessions', (b) => b.eq('status', 'terminee').gte('date_debut', jour(365)))
R.inscriptions = await cpt('inscriptions')
R.apprenants = await cpt('apprenants')
R.formateurs = await cpt('formateurs')
R.conventions = await cpt('conventions')
R.devis = await cpt('devis')
R.reclamations = await cpt('reclamations')
R.actionsAmelioration = await cpt('actions_amelioration')
R.veilles = await cpt('veilles')
R.documents = await cpt('documents')

// Preuves par type de document déposé
const { data: docs } = await supabase
  .from('documents').select('type').eq('organization_id', ORG).limit(20000)
R.parType = {}
for (const d of docs || []) R.parType[d.type] = (R.parType[d.type] || 0) + 1

// Questionnaires
const { data: qr } = await supabase
  .from('qcm_reponses').select('is_complete, qcm:qcm_id(type)').eq('organization_id', ORG).limit(20000)
R.qcm = {}
for (const r of qr || []) {
  const t = r.qcm?.type || 'inconnu'
  R.qcm[t] = R.qcm[t] || { total: 0, complets: 0 }
  R.qcm[t].total++
  if (r.is_complete) R.qcm[t].complets++
}

// Émargements
R.emargements = await cptL('emargements')
const { data: em } = await supabase.from('emargements').select('est_present, signature_data, signed_at').limit(20000)
R.emargPresents = (em || []).filter((e) => e.est_present).length
R.emargSignes = (em || []).filter((e) => e.signature_data).length

// Incidents / dysfonctionnements
R.incidents = await cpt('incidents')
const { data: inc } = await supabase.from('incidents').select('type, statut').eq('organization_id', ORG).limit(5000)
R.incParStatut = {}
for (const i of inc || []) R.incParStatut[i.statut] = (R.incParStatut[i.statut] || 0) + 1

// Organisation : mentions obligatoires
const { data: org } = await supabase.from('organizations').select('*').eq('id', ORG).maybeSingle()
R.org = {
  numero_da: org?.numero_da || null,
  referent_handicap: org?.referent_handicap_nom || null,
  referent_pedago: org?.referent_pedagogique_nom || null,
  delai_acces: org?.delai_acces || null,
  cgv: org?.cgv_url || org?.reglement_interieur_url || null,
}

// Indicateurs de résultats (ind. 2)
const ir = await supabase.from('indicateurs_resultats').select('*').eq('organization_id', ORG)
R.resultats = ir.error ? `ERR ${ir.error.message.slice(0, 50)}` : (ir.data || []).length
R.resultatsPublies = ir.error ? '?' : (ir.data || []).filter((x) => x.publie).length

// Formateurs : CV / diplômes / contrats (ind. 17, 21, 22)
const { data: fo } = await supabase.from('formateurs').select('id, cv_url, is_active, diplomes, qualifications, formateur_secours').eq('organization_id', ORG).limit(2000)
R.formateursCv = (fo || []).filter((f) => f.cv_url).length
R.formateursActifs = (fo || []).filter((f) => f.is_active).length
const rempli = (v) => Array.isArray(v) ? v.length > 0 : !!String(v ?? '').trim()
R.formateursDiplomes = (fo || []).filter((f) => rempli(f.diplomes)).length
R.formateursQualif = (fo || []).filter((f) => rempli(f.qualifications)).length
R.formateursSecours = (fo || []).filter((f) => f.formateur_secours).length
R.contratsFormateur = await cpt('contrats_formateur')
R.contratsSignes = await cpt('contrats_formateur', (b) => b.not('signature_formateur_date', 'is', null))
R.sessionsAvecRecueil = (await supabase.from('recueil_besoins').select('id', { count: 'exact', head: true })).count ?? 'table absente'
const dossForm = await cptL('documents', (b) => b.in('type', ['cv', 'diplome', 'contrat_formateur']))
R.docsFormateur = dossForm

console.log(JSON.stringify(R, null, 2))
