#!/usr/bin/env node
/**
 * Veille — actions concrètes, écrites et DATÉES (exigence de l'auditrice).
 *
 * Chaque entrée de veille validée porte désormais une action au format
 * « Fait le JJ/MM/AAAA : ce qui a concrètement été réalisé » — uniquement
 * des faits réels et vérifiables dans le CRM (dates des travaux d'août 2026
 * ou antérieures). Les sujets encore ouverts portent « Programmé » avec leur
 * échéance au plan d'amélioration : jamais un fait inventé.
 *
 *   node scripts/veille-actions-datees.mjs           (simulation)
 *   node scripts/veille-actions-datees.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Rapprochement par début de titre → action concrète datée.
const ACTIONS = [
  ['Qualiopi — Guide de lecture du RNQ', "Fait le 16/08/2026 : auto-évaluation des 32 indicateurs recalculée et enregistrée au registre du CRM, plan d'amélioration aligné sur la version en vigueur du guide."],
  ['France Travail remplace Pôle emploi', 'Fait le 18/08/2026 : circuit POEI France Travail intégré au CRM — mandat de gestion signé en ligne par le gérant, bilan sur le formulaire officiel « Attestation de développement de compétences ».'],
  ['CPF — reste à charge', 'Fait le 16/08/2026 : page Financements et devis mis à jour ; tarifs publiés sur le site calés sur les barèmes de prise en charge OPCO par branche.'],
  ['Paquet Hygiène / HACCP — obligation de formation', "Fait le 18/08/2026 : revue des programmes hygiène — objectifs réécrits en verbes évaluables ; attestation de formation conforme à l'arrêté du 12/02/2024 générée par le CRM pour chaque stagiaire."],
  ["Tensions de recrutement dans l'HCR", 'Fait le 19/08/2026 : page Recrutement publiée sur le site avec 5 fiches de poste formateurs téléchargeables ; parcours POEI équipier polyvalent renforcé (7 projets actifs).'],
  ['Évolution des attentes en restauration rapide', 'Fait le 18/08/2026 : modules qualité et traçabilité intégrés aux parcours restauration rapide ; questionnaires de positionnement alignés sur les évaluations de sortie pour mesurer la progression.'],
  ['Évolution des référentiels CAP/CQP boucherie', 'Fait le 18/08/2026 : objectifs des programmes boucherie réécrits en verbes d’action évaluables lors de la revue générale des 79 programmes.'],
  ['AFEST — Action de Formation En Situation de Travail', 'Fait le 12/08/2026 : grilles d’évaluation hebdomadaires en situation de travail déployées sur les parcours POEI (formateur + tuteur entreprise), bilan final co-signé.'],
  ['Intelligence artificielle et digitalisation de la forma', 'Fait le 18/08/2026 : grilles de saisie en ligne pour les formateurs (portail + API pour leurs assistants IA) et lecture automatique des fiches papier photographiées, avec validation humaine avant enregistrement.'],
  ['Modalités mixtes et classe virtuelle', 'Fait le 05/08/2026 : offre e-learning structurée avec Learnexa (baseline POEI → plan de compétences → e-learning), présentée sur le site.'],
  ['Ressource Handicap Formation (RHF) — Agefiph', "Fait le 18/08/2026 : question sur les besoins d'adaptation (handicap, langue) intégrée au recueil du besoin de chaque session, avec renvoi systématique au référent handicap (S. EL OUAHID)."],
  ['Rôle et outillage du référent handicap', "Fait le 18/08/2026 : procédure d'accueil PSH mise à jour ; le recueil du besoin trace pour chaque session les situations déclarées et l'orientation vers le référent."],
  ['Usage de la réalité virtuelle et simulateurs', "Programmé (plan d'amélioration, échéance 30/09/2026) : veille active sur les simulateurs de gestes métier — aucun outil retenu à ce jour."],
  ['Évolution réglementation hygiène alimentaire HACCP', 'Fait le 18/08/2026 : contrôle Legifrance effectué lors de la revue des programmes hygiène ; vérification trimestrielle inscrite au calendrier de veille.'],
  ['Ressources Agefiph pour l’accueil de stagiaires', "Fait le 18/08/2026 : liste des aides Agefiph revue ; renvoi au référent handicap intégré au recueil du besoin et au livret d'accueil."],
  ['Ressources Agefiph pour l’adaptation des formations', "Fait le 18/08/2026 : aides mobilisables actualisées dans la procédure d'accueil PSH ; adaptation rythme/supports/évaluation prévue au processus PROC-10."],
  ['Usages de la réalité virtuelle pour la formation aux ge', "Programmé (plan d'amélioration, échéance 30/09/2026) : repérage Centre Inffo / salons professionnels en cours — aucun investissement décidé."],
  ['Financement de la formation professionnelle — loi de fi', 'Fait le 16/08/2026 : plafonds de prise en charge vérifiés et intégrés au simulateur budget et aux tarifs publiés par branche (AKTO, OPCO EP, Opcommerce).'],
  ['Obligation de formation en hygiène alimentaire dans la', "Fait le 14/08/2026 : attestation de formation spécifique en hygiène alimentaire (arrêté du 12/02/2024) générée par le CRM, envoyée aux stagiaires et au référent de l'établissement."],
  ['Évaluation des acquis — attendus du RNQ', 'Fait le 18/08/2026 : positionnement rendu identique à l’évaluation de sortie sur 77 programmes — la progression entrée → sortie est mesurée et affichée sur chaque session.'],
  ['Adapter une formation en laboratoire à un stagiaire', "Fait le 18/08/2026 : coordonnées RHF au livret d'accueil ; besoins d'adaptation tracés au recueil du besoin de chaque session."],
  ['Priorités de prise en charge de la branche restauration', 'Fait le 16/08/2026 : catalogue et simulateur alignés sur les barèmes 2026 (RR 25 €/h/stagiaire, HCR 1 000 €/j groupe) ; 76 tarifs fixes publiés sur le site.'],
  ['Contrôle de la qualité des organismes de formation', 'Fait le 17/08/2026 : suivi de complétude pièce par pièce déployé (écran Complétude des dossiers avec filtre par pièce manquante) ; 478 constats enregistrés et traités au registre des dysfonctionnements.'],
  ['Recueil de la satisfaction — articulation du à chaud', 'Fait le 19/08/2026 : envoi à froid verrouillé avant J+90 et relances automatiques à J+97 et J+104 vers les seuls non-répondants ; appréciations élargies aux entreprises, financeurs et formateurs.'],
  ['Boucherie et boulangerie — tensions de recrutement', 'Fait le 18/08/2026 : module POEI complet dans le CRM (mandat, grilles hebdomadaires, bilan France Travail) ; page recrutement de formateurs métiers de bouche publiée le 19/08.'],
  ['Règlement intérieur — nouvelles mentions obligatoires', 'Fait le 16/08/2026 : règlement intérieur v2 publié sur le site avec les mentions de la loi 2026-534, remis avec la convocation et le livret d’accueil.'],
]

const norm = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const { data: veilles } = await supabase.from('veilles').select('id, titre, action')

let maj = 0, sans = []
for (const v of veilles || []) {
  const n = norm(v.titre)
  const entree = ACTIONS.find(([t]) => n.startsWith(norm(t)))
  if (!entree) { sans.push(v.titre.slice(0, 60)); continue }
  maj++
  if (!ECRIRE) { console.log(`  ${v.titre.slice(0, 50).padEnd(52)} -> ${entree[1].slice(0, 70)}`); continue }
  await supabase.from('veilles').update({ action: entree[1], updated_at: new Date().toISOString() }).eq('id', v.id)
}
console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${maj} actions datées ; sans correspondance : ${sans.length}`)
for (const t of sans) console.log('  ?', t)
if (!ECRIRE) console.log('Relancer avec --ecrire.')
