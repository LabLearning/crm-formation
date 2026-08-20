#!/usr/bin/env node
/**
 * Modalités pédagogiques PAR MODULE (indicateur 6) : chaque module du
 * programme détaillé reçoit son bloc « Modalités pédagogiques », adapté à la
 * nature du module (pratique au poste pour l'hygiène et les gestes, analyse
 * de documents pour le réglementaire, mises en situation pour le management…).
 *
 * Le programme est du texte structuré « Module N — titre » : on insère le
 * bloc à la fin de chaque module. Idempotent : un module qui a déjà ses
 * modalités n'est pas retouché. Le PDF programme et la fiche du site
 * affichent ce texte tel quel — les modalités apparaissent partout.
 *
 *   node scripts/modalites-modules.mjs           (simulation)
 *   node scripts/modalites-modules.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Modalités choisies d'après le contenu réel du module.
function modalitesPour(texteModule) {
  const n = texteModule.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/nettoyage|desinfection|temperature|stockage|reception|conservation|marche en avant|contamination/.test(n)) return [
    'Démonstration par le formateur au poste de travail, sur l\'équipement réel de l\'établissement.',
    'Mise en pratique individuelle immédiate (relevés, autocontrôles, plan de nettoyage), reprise des gestes non acquis.',
    'Études de cas tirées du fonctionnement de l\'établissement.',
  ]
  if (/reglement|legislation|obligation|document unique|duerp|responsabilite|sanction|norme|haccp|pms|tracabilite|etiquet|affichage/.test(n)) return [
    'Apports théoriques courts illustrés de cas concrets du secteur.',
    'Analyse en groupe des documents réels de l\'établissement (registres, étiquettes, affichages, DUERP).',
    'Atelier collectif : mise à jour des documents avec les stagiaires.',
  ]
  if (/gestes|postures|manutention|tms|secour|sst|incendie|evacuation|extincteur|premiers secours/.test(n)) return [
    'Démonstration commentée puis mise en situation pratique de chaque stagiaire.',
    'Exercices répétés sur le matériel de l\'établissement, correction individuelle des gestes.',
    'Debriefing collectif après chaque mise en situation.',
  ]
  if (/management|equipe|conflit|communication|entretien|motivation|leadership|recrutement|brief/.test(n)) return [
    'Mises en situation et jeux de rôle sur des cas réels apportés par les stagiaires.',
    'Échanges de pratiques animés par le formateur, apports structurés en appui.',
    'Construction d\'outils directement réutilisables (trames d\'entretien, brief d\'équipe).',
  ]
  if (/vente|client|accueil|fidelisation|reclamation|caisse|encaissement/.test(n)) return [
    'Jeux de rôle accueil/vente en conditions réelles de comptoir.',
    'Observation puis analyse de situations de service de l\'établissement.',
    'Entraînement individuel avec retour immédiat du formateur.',
  ]
  if (/gestion|rentabilite|couts|marge|budget|tresorerie|tableau de bord|prix/.test(n)) return [
    'Travail sur les chiffres réels de l\'établissement (anonymisés si besoin).',
    'Construction pas à pas d\'outils de pilotage simples (fiches techniques, ratios).',
    'Exercices d\'application corrigés individuellement.',
  ]
  return [
    'Apports théoriques courts illustrés d\'exemples du secteur.',
    'Mise en pratique accompagnée sur le poste de travail réel.',
    'Questions-réponses ancrées dans le quotidien de l\'équipe.',
  ]
}

const { data: formations } = await s.from('formations')
  .select('id, intitule, programme_detaille').eq('is_active', true)

let touchees = 0, modulesCompletes = 0, dejaOk = 0
for (const f of formations || []) {
  const prog = String(f.programme_detaille || '')
  if (!prog.trim() || /modalites pedagogiques/i.test(prog.normalize('NFD').replace(/[̀-ͯ]/g, ''))) { dejaOk++; continue }
  // Découpe en blocs « Module N — … » (l'en-tête avant le 1er module reste en tête)
  const parts = prog.split(/(?=^Module\s+\d+)/m)
  if (parts.length < 2) { dejaOk++; continue }
  const nouveaux = parts.map((bloc) => {
    if (!/^Module\s+\d+/.test(bloc)) return bloc
    const modalites = modalitesPour(bloc)
    modulesCompletes++
    const finPropre = bloc.replace(/\s+$/, '')
    return `${finPropre}\nModalités pédagogiques\n${modalites.map((m) => `• ${m}`).join('\n')}\n\n`
  })
  touchees++
  if (ECRIRE) {
    await s.from('formations').update({
      programme_detaille: nouveaux.join('').replace(/\n{3,}/g, '\n\n').trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', f.id)
  }
}
console.log(`${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${touchees} programmes, ${modulesCompletes} modules complétés (${dejaOk} déjà pourvus ou sans structure module).`)
