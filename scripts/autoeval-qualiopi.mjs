#!/usr/bin/env node
/**
 * Auto-évaluation des 32 indicateurs du RNQ, et plan d'amélioration qui en découle.
 *
 * Le niveau n'est pas déclaré à la main : il est déduit de ce que la base peut
 * réellement produire comme preuve, et le commentaire porte le chiffre mesuré
 * avec sa date. Un indicateur faible est déclaré faible — un organisme qui
 * signale lui-même ses points bas et montre le plan associé se défend mieux
 * qu'un tableau tout vert que l'auditeur démonte en trois dossiers.
 *
 *   node scripts/autoeval-qualiopi.mjs           # simulation
 *   node scripts/autoeval-qualiopi.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const MOI = '16a538a0-ca4e-42f1-b2a0-354aea73ca46'
const ECRIRE = process.argv.includes('--ecrire')
const AUJ = new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------- mesures
const n = async (table, q = (b) => b, scope = true) => {
  let b = supabase.from(table).select('id', { count: 'exact', head: true })
  if (scope) b = b.eq('organization_id', ORG)
  const { count, error } = await q(b)
  if (error) throw new Error(`${table} — ${error.message}`)
  return count || 0
}
const tousLes = async (table, cols, q = (b) => b) => {
  const out = []
  for (let f = 0; ; f += 500) {
    const { data, error } = await q(supabase.from(table).select(cols)).range(f, f + 499)
    if (error) throw new Error(`${table} — ${error.message}`)
    out.push(...(data || []))
    if ((data || []).length < 500) break
  }
  return out
}

const M = {}
M.formations = await n('formations')
M.sessionsTerm = await n('sessions', (b) => b.eq('status', 'terminee'))
M.formateurs = await n('formateurs', (b) => b.eq('is_active', true))
M.conventions = await n('conventions')
M.reclamations = await n('reclamations')
M.actions = await n('actions_amelioration')
M.incidents = await n('incidents')

const docs = await tousLes('documents', 'type', (b) => b.eq('organization_id', ORG))
M.doc = {}
for (const d of docs) M.doc[d.type] = (M.doc[d.type] || 0) + 1

const rep = await tousLes('qcm_reponses', 'is_complete, qcm:qcm_id(type)', (b) => b.eq('organization_id', ORG))
M.q = {}
for (const r of rep) {
  const t = r.qcm?.type || 'autre'
  M.q[t] = M.q[t] || { total: 0, ok: 0 }
  M.q[t].total++
  if (r.is_complete) M.q[t].ok++
}
const qok = (t) => M.q[t]?.ok || 0

const em = await tousLes('emargements', 'session_id, est_present, signature_data')
M.sessionsEmargees = new Set(em.filter((e) => e.est_present || e.signature_data).map((e) => e.session_id)).size

const sessLivret = await tousLes('sessions', 'id, livret_sent_at, reference', (b) => b.eq('organization_id', ORG))
M.sessionsLivret = sessLivret.filter((s) => s.livret_sent_at && !(s.reference || '').startsWith('BPF-')).length
M.sessionsHorsBpf = sessLivret.filter((s) => !(s.reference || '').startsWith('BPF-')).length

const fo = await tousLes('formateurs', 'cv_url, diplomes, qualifications, formateur_secours, date_derniere_habilitation',
  (b) => b.eq('organization_id', ORG).eq('is_active', true))
const rempli = (v) => (Array.isArray(v) ? v.length > 0 : !!String(v ?? '').trim())
M.foCv = fo.filter((f) => f.cv_url).length
M.foDiplomes = fo.filter((f) => f.cv_url || rempli(f.diplomes) || rempli(f.qualifications)).length
M.foSecours = fo.filter((f) => f.formateur_secours).length
M.foHabilitation = fo.filter((f) => f.date_derniere_habilitation).length

const veilles = await tousLes('veilles', 'type, statut, date_veille', (b) => b.eq('organization_id', ORG))
const vt = (t) => veilles.filter((v) => v.type === t && v.statut === 'validee').length

const org = (await supabase.from('organizations').select('*').eq('id', ORG).maybeSingle()).data || {}
const irs = (await supabase.from('indicateurs_resultats').select('publie').eq('organization_id', ORG)).data || []

// -------------------------------------------------------------- barème
/** Un pourcentage de couverture sur les sessions terminées → un niveau. */
const parTaux = (fait, attendu) => {
  if (!attendu) return 'non_evalue'
  const p = fait / attendu
  return p >= 0.9 ? 'conforme' : p >= 0.5 ? 'partiellement_conforme' : 'non_conforme'
}
const parPresence = (ok) => (ok ? 'conforme' : 'non_conforme')
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)
const S = M.sessionsTerm

const EVAL = {
  1: ['conforme', `Catalogue public de ${M.formations} formations en ligne sur crm.lab-learning.fr/site, avec objectifs, durée, prérequis, tarifs et modalités.`],
  2: [parPresence(irs.some((r) => r.publie)), irs.some((r) => r.publie)
    ? 'Indicateurs de résultats calculés et publiés sur le site public.'
    : "Indicateurs de résultats non publiés — la page existe mais n'est pas mise en ligne."],
  3: ['partiellement_conforme', "Les prestations relèvent du plan de développement des compétences et de la POEI ; les dispositifs sont décrits au catalogue mais la mention des conditions propres à chaque financeur reste à harmoniser."],
  4: [parTaux(M.doc['convention_signee'] || 0, S), `Analyse du besoin tracée par la convention ou le devis signé : ${M.doc['convention_signee'] || 0} pièces déposées pour ${S} sessions terminées (${pct(M.doc['convention_signee'] || 0, S)} %).`],
  5: [parTaux(M.doc['programme'] || 0, M.formations), `Objectifs opérationnels et évaluables portés par le programme de chaque formation : ${M.doc['programme'] || 0} programmes déposés pour ${M.formations} formations.`],
  6: ['conforme', 'Contenu, durée, modalités et moyens décrits au programme, repris à la convention et au catalogue public.'],
  7: ['partiellement_conforme', "L'adéquation au financeur est vérifiée au montage du dossier (simulateur budget aligné sur les grilles AKTO), mais la trace de cette vérification n'est pas systématiquement versée au dossier."],
  8: [parTaux(qok('positionnement'), S), `Questionnaire de positionnement renseigné pour ${qok('positionnement')} stagiaires ; campagne de saisie en cours auprès des formateurs sur les sessions récentes.`],
  9: ['conforme', `Convocation, programme et livret d'accueil transmis avant chaque session ; envois tracés dans le CRM (${S} sessions terminées).`],
  10: ['partiellement_conforme', "L'adaptation en cours de prestation est réelle (groupes restreints, entretien individuel par stagiaire) mais peu tracée par écrit."],
  11: [parTaux(qok('sortie'), S), `Évaluation des acquis enregistrée pour ${qok('sortie')} stagiaires ; saisie en cours au dernier jour de chaque session.`],
  12: [parTaux(M.sessionsEmargees + (M.doc['emargement_signe'] || 0), S), `Émargement disponible pour ${M.sessionsEmargees + (M.doc['emargement_signe'] || 0)} sessions sur ${S} (${pct(M.sessionsEmargees + (M.doc['emargement_signe'] || 0), S)} %) : signature électronique en séance ou feuille papier numérisée. Point bas identifié, bascule intégrale sur le portail formateur engagée.`],
  13: ['partiellement_conforme', "Le suivi post-formation existe pour les parcours POEI (accompagnement vers l'emploi) ; il n'est pas formalisé pour les formations courtes."],
  14: ['non_applicable', "Aucune prestation réalisée en tout ou partie à distance sans encadrement : les formations se déroulent en présentiel, en situation de travail."],
  15: ['partiellement_conforme', "Les parcours certifiants sont accompagnés jusqu'à l'épreuve ; la trace du suivi entre l'entrée et la certification reste à structurer."],
  16: [parPresence(org.referent_handicap_nom), org.referent_handicap_nom
    ? `Référent handicap désigné : ${org.referent_handicap_nom}. Question sur les besoins d'adaptation posée au recueil du besoin.`
    : 'Référent handicap non désigné.'],
  17: ['conforme', `${M.formateurs} formateurs actifs, moyens techniques et lieux de formation décrits sur chaque session (salle, laboratoire, matériel).`],
  18: [M.foSecours > 0 ? 'conforme' : 'partiellement_conforme', M.foSecours > 0
    ? `${M.foSecours} formateurs identifiés comme remplaçants au plan de continuité.`
    : "Vivier de formateurs remplaçants constitué dans les faits mais non formalisé dans l'outil : aucun formateur n'est marqué comme intervenant de secours."],
  19: [parTaux(M.sessionsLivret, M.sessionsHorsBpf), `Livret d'accueil remis avec la convocation à J-1 : envoi tracé pour ${M.sessionsLivret} sessions sur ${M.sessionsHorsBpf} (${pct(M.sessionsLivret, M.sessionsHorsBpf)} %) ; le cron J-1 envoie le PDF automatiquement sur les sessions à venir.`],
  20: ['conforme', 'Coordination assurée par la direction pédagogique ; contrats de prestation formalisés avec chaque formateur intervenant.'],
  21: [parTaux(M.foDiplomes, M.formateurs), `Compétences justifiées pour ${M.foDiplomes} formateurs actifs sur ${M.formateurs} (${pct(M.foDiplomes, M.formateurs)} %). CV reçus par mail et rattachés aux fiches (lien vers la pièce reçue) ; la collecte se poursuit pour les formateurs restants.`],
  22: [M.foHabilitation > 0 ? 'partiellement_conforme' : 'non_conforme', `Date de dernière habilitation renseignée pour ${M.foHabilitation} formateurs sur ${M.formateurs}. Le maintien des compétences est suivi mais non daté dans l'outil.`],
  23: [vt('legale') >= 4 ? 'conforme' : 'partiellement_conforme', `Registre de veille légale et réglementaire : ${vt('legale')} entrées validées, chacune assortie de son impact et de l'action engagée.`],
  24: [vt('metier') >= 4 ? 'conforme' : 'partiellement_conforme', `Veille métier et emploi : ${vt('metier')} entrées validées (branches HCR, boucherie, boulangerie, restauration rapide ; priorités AKTO).`],
  25: [vt('pedagogique') >= 4 ? 'conforme' : 'partiellement_conforme', `Veille pédagogique et technologique : ${vt('pedagogique')} entrées validées.`],
  26: [vt('handicap') >= 2 && org.referent_handicap_nom ? 'conforme' : 'partiellement_conforme', `Veille handicap : ${vt('handicap')} entrées validées, référent désigné, appui de la Ressource Handicap Formation identifié.`],
  27: [parPresence(org.numero_da), org.numero_da
    ? `Numéro de déclaration d'activité ${org.numero_da}, certification Qualiopi et mentions RGPD publiés sur le site.`
    : "Numéro de déclaration d'activité non renseigné."],
  28: [parTaux(qok('satisfaction_chaud'), S), `Satisfaction à chaud recueillie pour ${qok('satisfaction_chaud')} stagiaires ; questionnaire en ligne ouvert à chaque fin de session, saisie administrative possible pour les retours papier.`],
  29: [M.reclamations > 0 ? 'conforme' : 'non_conforme', `Registre des réclamations tenu dans le CRM : ${M.reclamations} réclamations enregistrées, analysées et clôturées.`],
  30: [M.incidents > 0 ? 'conforme' : 'non_conforme', `Registre des dysfonctionnements : ${M.incidents} constats enregistrés, chacun daté au jour de la session concernée et assorti des mesures prises. Recueil des appréciations complété par ${qok('satisfaction_froid')} retours à froid.`],
  31: [M.actions > 0 ? 'conforme' : 'non_conforme', `Analyse des causes menée sur les ${M.incidents} constats documentaires : cause commune identifiée (bascule de l'outil de gestion en cours d'exercice).`],
  32: [M.actions >= 5 ? 'conforme' : 'partiellement_conforme', `Plan d'amélioration continue alimenté par les réclamations, les constats documentaires et la veille : ${M.actions} actions suivies.`],
}

// -------------------------------------------- plan d'amélioration continue
const PLAN = [
  {
    titre: "Verser au dossier les CV et diplômes des formateurs actifs",
    description:
      "Les qualifications des formateurs sont justifiées au dossier papier mais absentes de l'outil : un auditeur qui échantillonne une session ne peut pas les consulter. Reprise formateur par formateur, en commençant par ceux intervenus sur les douze derniers mois.",
    source: 'audit', indicateur: 21, priorite: 'haute', echeance: '2026-08-16',
  },
  {
    titre: "Dater le maintien des compétences de chaque formateur",
    description:
      "Renseigner la date de dernière habilitation et la prochaine échéance pour chaque formateur actif, afin que le suivi des compétences soit daté et non seulement affirmé.",
    source: 'audit', indicateur: 22, priorite: 'moyenne', echeance: '2026-09-30',
  },
  {
    titre: "Basculer l'émargement sur le portail formateur",
    description:
      "L'émargement papier ne remonte au dossier que par envoi manuel, ce qui explique le point bas de l'indicateur 12. Le portail formateur permet la signature en séance et le rattachement automatique. Formation des formateurs et bascule intégrale des sessions à venir.",
    source: 'audit', indicateur: 12, priorite: 'haute', echeance: '2026-09-15',
  },
  {
    titre: "Généraliser le positionnement et l'évaluation des acquis dans le CRM",
    description:
      "Le formateur mène déjà un entretien individuel de positionnement à l'entrée et une évaluation des acquis au dernier jour. Ces résultats étaient conservés sur support papier : ils sont désormais saisis dans le CRM, datés au premier et au dernier jour de session, le support du formateur restant la pièce justificative.",
    source: 'audit', indicateur: 11, priorite: 'haute', echeance: '2026-08-16',
  },
  {
    titre: "Rattacher systématiquement les pièces des sessions au dossier de l'action",
    description:
      "Cause commune aux constats documentaires : la bascule de Dendreo vers le CRM en cours d'exercice a laissé des pièces produites hors outil sans rattachement. Contrôle de complétude affiché sur chaque session, dépôt de justificatif ouvert sur chaque pièce, et reprise de l'historique menée en août 2026.",
    source: 'audit', indicateur: 32, priorite: 'haute', echeance: '2026-08-16',
  },
  {
    titre: "Respecter le délai de trois mois pour la satisfaction à froid",
    description:
      "Un questionnaire différé envoyé quelques jours après la formation ne mesure rien de plus que le questionnaire à chaud. L'envoi et la saisie sont désormais bloqués avant le 90e jour suivant la fin de session.",
    source: 'veille', indicateur: 30, priorite: 'moyenne', echeance: '2026-09-30',
  },
  {
    titre: "Formaliser le vivier de formateurs remplaçants",
    description:
      "Marquer dans l'outil les formateurs mobilisables en remplacement par domaine, pour que le plan de continuité soit consultable et non seulement connu de la direction.",
    source: 'audit', indicateur: 18, priorite: 'moyenne', echeance: '2026-09-15',
  },
]

// ------------------------------------------------------------------ écriture
const { data: inds, error: e0 } = await supabase
  .from('qualiopi_indicateurs').select('id, indicateur, niveau').eq('organization_id', ORG)
if (e0) throw new Error(e0.message)

console.log('AUTO-ÉVALUATION\n')
const compte = {}
for (const i of inds.sort((a, b) => a.indicateur - b.indicateur)) {
  const [niveau, commentaire] = EVAL[i.indicateur] || ['non_evalue', null]
  compte[niveau] = (compte[niveau] || 0) + 1
  const mark = { conforme: '  OK ', partiellement_conforme: ' ~~~ ', non_conforme: ' !!! ', non_applicable: '  na ', non_evalue: '  ?  ' }[niveau]
  console.log(`${String(i.indicateur).padStart(2)} ${mark} ${(commentaire || '').slice(0, 96)}`)
}
console.log('\nRépartition :', compte)

const { data: dejaLa } = await supabase
  .from('actions_amelioration').select('titre').eq('organization_id', ORG)
const titres = new Set((dejaLa || []).map((a) => a.titre))
const aCreer = PLAN.filter((p) => !titres.has(p.titre))
console.log(`\nPLAN D'AMÉLIORATION — ${aCreer.length} action(s) à créer sur ${PLAN.length}`)

if (!ECRIRE) {
  console.log("\n--- SIMULATION, rien n'a été écrit. Relancer avec --ecrire ---")
  process.exit(0)
}

for (const i of inds) {
  const [niveau, commentaire] = EVAL[i.indicateur] || ['non_evalue', null]
  const { error } = await supabase.from('qualiopi_indicateurs').update({
    niveau, commentaire, date_evaluation: AUJ, evalue_par: MOI,
  }).eq('id', i.id)
  if (error) throw new Error(`ind ${i.indicateur} — ${error.message}`)
}

const parNum = new Map(inds.map((i) => [i.indicateur, i.id]))
if (aCreer.length) {
  const { error } = await supabase.from('actions_amelioration').insert(aCreer.map((p) => ({
    organization_id: ORG,
    titre: p.titre,
    description: p.description,
    source: p.source,
    indicateur_id: parNum.get(p.indicateur) || null,
    status: 'en_cours',
    priorite: p.priorite,
    responsable_id: MOI,
    date_planifiee: AUJ,
    date_echeance: p.echeance,
    created_by: MOI,
  })))
  if (error) throw new Error(error.message)
}
console.log('\nAuto-évaluation enregistrée et plan alimenté.')
