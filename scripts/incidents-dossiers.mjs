/**
 * Consigne au registre des dysfonctionnements chaque session terminée dont le
 * dossier est incomplet.
 *
 * L'indicateur 32 demande de recueillir et traiter les dysfonctionnements. Un
 * dossier incomplet en est un : le constater soi-même, le dater et lui
 * attacher une action corrective vaut infiniment mieux que de le laisser
 * découvrir par l'auditeur.
 *
 * Un incident par session, listant les pièces absentes — et non un par
 * document : à quatre pièces manquantes en moyenne sur 481 sessions, le
 * registre deviendrait illisible, or il est fait pour être lu.
 *
 * La date de l'incident est celle du CONSTAT, pas celle de la session. Il
 * s'agit de dire « nous l'avons détecté le 12 août », pas de laisser croire
 * que le suivi existait à l'époque.
 *
 * Idempotent : le marqueur en fin de description évite les doublons.
 *
 *   node scripts/incidents-dossiers.mjs           (simulation)
 *   node scripts/incidents-dossiers.mjs --ecrire  (écriture réelle)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')
const MARQUEUR = '[CONSTAT-DOSSIER]'

const PIECES = [
  { cle: 'convention',    label: 'Convention de formation signée', indicateur: 14, majeure: true,  doc: 'convention_signee' },
  { cle: 'emargement',    label: "Feuille d'émargement signée",    indicateur: 12, majeure: true,  doc: 'emargement_signe' },
  { cle: 'contrat',       label: 'Contrat de prestation formateur', indicateur: 21, majeure: false, doc: 'contrat_formateur' },
  { cle: 'recueil',       label: 'Recueil du besoin',              indicateur: 4,  majeure: false, doc: 'recueil_besoin' },
  { cle: 'positionnement',label: 'Questionnaire de positionnement', indicateur: 8,  majeure: false, doc: 'positionnement' },
  { cle: 'acquis',        label: 'Évaluation des acquis',          indicateur: 11, majeure: true,  doc: 'evaluation_acquis' },
  { cle: 'satisfaction',  label: 'Évaluation de satisfaction',     indicateur: 28, majeure: false, doc: 'satisfaction' },
]

const pages = async (fn) => {
  const out = []; let from = 0
  for (;;) {
    const { data, error } = await fn(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
    from += 1000
  }
  return out
}

const sessions = (await pages((f, t) => supabase.from('sessions')
  .select('id, reference, intitule, date_debut, date_fin, client_id, formation:formation_id(intitule), client:client_id(raison_sociale)')
  .eq('organization_id', ORG).eq('status', 'terminee').range(f, t)))
  .filter((s) => !String(s.reference || '').startsWith('BPF-'))
const ids = new Set(sessions.map((s) => s.id))

const [docs, conv, ctr, em, rec, evAcq, qs, qr, qcms] = await Promise.all([
  pages((f, t) => supabase.from('documents').select('session_id, type').eq('organization_id', ORG).not('session_id', 'is', null).range(f, t)),
  pages((f, t) => supabase.from('conventions').select('session_id, signature_client_date').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('contrats_formateur').select('session_id').eq('organization_id', ORG).neq('status', 'annule').range(f, t)),
  pages((f, t) => supabase.from('emargements').select('session_id').eq('organization_id', ORG).or('signature_data.not.is.null,est_present.eq.true').range(f, t)),
  pages((f, t) => supabase.from('recueils_besoin').select('session_id').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('evaluations_acquis').select('session_id').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('qcm_sessions').select('session_id, qcm_id').range(f, t)),
  pages((f, t) => supabase.from('qcm_reponses').select('session_id, qcm_id').eq('organization_id', ORG).eq('is_complete', true).range(f, t)),
  pages((f, t) => supabase.from('qcm').select('id, type').eq('organization_id', ORG).range(f, t)),
])

const typeQcm = new Map(qcms.map((q) => [q.id, q.type]))
const typesRepondus = new Map()
for (const r of qr) {
  if (!ids.has(r.session_id)) continue
  const t = typeQcm.get(r.qcm_id)
  if (!t) continue
  if (!typesRepondus.has(r.session_id)) typesRepondus.set(r.session_id, new Set())
  typesRepondus.get(r.session_id).add(t)
}
const docsPar = new Map()
for (const d of docs) {
  if (!ids.has(d.session_id)) continue
  if (!docsPar.has(d.session_id)) docsPar.set(d.session_id, new Set())
  docsPar.get(d.session_id).add(d.type)
}
const ens = (rows, filtre) => new Set(rows.filter((r) => ids.has(r.session_id) && (!filtre || filtre(r))).map((r) => r.session_id))
const aConv = ens(conv, (c) => c.signature_client_date)
const aCtr = ens(ctr), aEm = ens(em), aRec = ens(rec), aAcq = ens(evAcq)
const aType = (id, types) => { const s = typesRepondus.get(id); return !!s && types.some((t) => s.has(t)) }

const manquantesDe = (s) => {
  const natif = {
    convention: aConv.has(s.id),
    emargement: aEm.has(s.id),
    contrat: aCtr.has(s.id),
    recueil: aRec.has(s.id),
    positionnement: aType(s.id, ['positionnement']),
    acquis: aType(s.id, ['sortie']) || aAcq.has(s.id),
    satisfaction: aType(s.id, ['satisfaction_chaud', 'satisfaction_froid']),
  }
  const justifs = docsPar.get(s.id) || new Set()
  return PIECES.filter((p) => !natif[p.cle] && !justifs.has(p.doc))
}

// Incidents déjà consignés, pour ne pas les recréer
const existants = new Set(
  (await pages((f, t) => supabase.from('incidents').select('session_id, description')
    .eq('organization_id', ORG).eq('type', 'documentaire').range(f, t)))
    .map((i) => i.session_id),
)

const MESURES = [
  "1. Bascule de l'émargement sur le portail formateur : la feuille est signée en séance et remonte automatiquement au dossier, sans dépendre d'un envoi par mail.",
  "2. Contrôle de complétude affiché sur chaque fiche session : les pièces absentes sont visibles en permanence, pas découvertes à la clôture.",
  "3. Reprise documentaire menée en août 2026 sur l'historique : conventions, contrats et accords de prise en charge récupérés depuis l'ancien outil et les échanges de messagerie.",
  "4. Dépôt de justificatif ouvert sur chaque pièce, avec mention de sa provenance, pour les documents produits hors CRM.",
].join('\n')

const aujourdhui = new Date().toISOString().slice(0, 10)
const lignes = []

for (const s of sessions) {
  if (existants.has(s.id)) continue
  const manquantes = manquantesDe(s)
  if (manquantes.length === 0) continue

  const majeures = manquantes.filter((p) => p.majeure)
  const intitule = s.formation?.intitule || s.intitule || 'Formation'
  const client = s.client?.raison_sociale || 'client non renseigné'

  lignes.push({
    organization_id: ORG,
    session_id: s.id,
    client_id: s.client_id || null,
    date_incident: aujourdhui,
    type: 'documentaire',
    gravite: majeures.length >= 2 ? 'majeur' : majeures.length === 1 ? 'modere' : 'mineur',
    titre: `Dossier incomplet — ${s.reference || 'session'} (${manquantes.length} pièce${manquantes.length > 1 ? 's' : ''})`,
    description:
      `Session « ${intitule} » du ${s.date_debut} au ${s.date_fin || s.date_debut}, ${client}.\n\n`
      + `Pièces absentes du dossier au ${aujourdhui} :\n`
      + manquantes.map((p) => `  • ${p.label} (indicateur ${p.indicateur})${p.majeure ? ' — enjeu majeur' : ''}`).join('\n')
      + `\n\nCause identifiée : bascule de l'outil de gestion (Dendreo) vers le CRM en cours d'exercice. `
      + `Les pièces produites hors CRM n'étaient pas systématiquement rattachées au dossier de l'action.\n\n${MARQUEUR}`,
    mesures_prises: MESURES,
    // Les actions correctives sont deployees : le constat n'est pas « ouvert »
    // au sens d'un dysfonctionnement laisse sans reponse.
    statut: 'en_cours',
  })
}

const parGravite = lignes.reduce((a, l) => ({ ...a, [l.gravite]: (a[l.gravite] || 0) + 1 }), {})
console.log(`Sessions terminées analysées : ${sessions.length}`)
console.log(`Constats déjà consignés      : ${existants.size}`)
console.log(`Constats à créer             : ${lignes.length}`)
console.log(`  majeur ${parGravite.majeur || 0} · modéré ${parGravite.modere || 0} · mineur ${parGravite.mineur || 0}`)

if (!ECRIRE) {
  console.log('\n--- SIMULATION, rien n\'a été écrit. Relancer avec --ecrire ---\n')
  for (const l of lignes.slice(0, 3)) console.log(l.titre + '\n' + l.description + '\n')
  process.exit(0)
}

let ecrits = 0
for (let i = 0; i < lignes.length; i += 200) {
  const { error } = await supabase.from('incidents').insert(lignes.slice(i, i + 200))
  if (error) { console.error('ERREUR', error.message); process.exit(1) }
  ecrits += lignes.slice(i, i + 200).length
}
console.log(`\n${ecrits} constats consignés au registre.`)
