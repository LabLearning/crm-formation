/**
 * Grille d'évaluation POEI — « Équipier polyvalent en restauration rapide ».
 * Remplie par le formateur, par candidat, semaine après semaine.
 * Niveaux : NA (non acquis) · EC (en cours d'acquisition) · A (acquis).
 */

export type NiveauAcquis = 'NA' | 'EC' | 'A'
export const NIVEAUX: { value: NiveauAcquis; label: string; short: string }[] = [
  { value: 'NA', label: 'Non acquis', short: 'NA' },
  { value: 'EC', label: "En cours d'acquisition", short: 'EC' },
  { value: 'A', label: 'Acquis', short: 'A' },
]

export interface GrilleItem { id: string; label: string }
export interface GrilleSection { key: string; titre: string; items: GrilleItem[] }

export const GRILLE_SECTIONS: GrilleSection[] = [
  {
    key: 'technique',
    titre: 'Compétences techniques et opérationnelles',
    items: [
      "Applique les règles d'hygiène du personnel et adopte une tenue professionnelle adaptée.",
      'Identifie les principaux dangers alimentaires et prévient les contaminations croisées.',
      'Respecte la chaîne du froid, la chaîne du chaud et les températures applicables.',
      'Applique les règles relatives aux DLC, DDM, étiquetage, traçabilité et méthode FIFO.',
      'Réalise correctement les opérations de nettoyage et de désinfection.',
      'Renseigne ou respecte les contrôles et enregistrements prévus par le PMS.',
      'Applique les consignes de sécurité, utilise les EPI et adopte les gestes et postures adaptés.',
      'Organise et met en place son poste de travail avant le service.',
      'Prépare les sauces, garnitures, viandes, frites et produits chauds selon les standards.',
      "Respecte les recettes, les formats et les dosages prévus par l'enseigne.",
      'Assemble et plie un tacos proprement et conformément à la commande.',
      'Utilise la presse, la salamandre, la friteuse et les autres équipements en sécurité.',
      'Contrôle la conformité, la présentation et la qualité du produit avant envoi.',
      'Enchaîne plusieurs commandes en respectant les délais et la cadence attendue.',
      'Assure le réassort et anticipe les besoins pendant le service.',
      'Accueille le client, prend une commande et communique de manière professionnelle.',
      'Gère une erreur simple, une demande client ou une réclamation courante.',
      "Participe aux opérations d'ouverture, de fermeture, de rangement et de transmission.",
      'Réceptionne, contrôle et range les marchandises selon les procédures.',
      "Tient un poste complet avec un niveau d'autonomie compatible avec l'emploi visé.",
    ].map((label, i) => ({ id: `T${i + 1}`, label })),
  },
  {
    key: 'savoir_etre',
    titre: 'Savoir-être et comportement professionnel',
    items: [
      'Respecte les horaires, les consignes, le règlement intérieur et le cadre professionnel.',
      "Fait preuve d'assiduité, de ponctualité et de régularité dans l'effort.",
      "S'implique dans les activités et manifeste une motivation cohérente avec le poste visé.",
      'Écoute les consignes et tient compte des corrections ou conseils formulés.',
      "Communique clairement et de manière respectueuse avec le formateur et l'équipe.",
      "S'intègre dans le collectif et contribue au bon fonctionnement du travail en équipe.",
      'Adapte son comportement au rythme du service et gère correctement la pression du rush.',
      'Fait preuve de rigueur, de vigilance et de sens des responsabilités.',
      'Prend des initiatives adaptées sans sortir de son périmètre de responsabilité.',
      'Progresse au cours du parcours et mobilise les acquis dans des situations variées.',
    ].map((label, i) => ({ id: `S${i + 1}`, label })),
  },
]

/** Appréciation globale — uniquement sur l'évaluation finale. */
export const APPRECIATIONS: { key: string; label: string; options: string[] }[] = [
  { key: 'maitrise', label: 'Maîtrise technique globale', options: ['Insuffisante', 'Fragile', 'Satisfaisante', 'Très satisfaisante'] },
  { key: 'autonomie', label: 'Autonomie sur le poste', options: ['Insuffisante', 'Partielle', 'Satisfaisante', 'Complète'] },
  { key: 'cadence', label: 'Rapidité et gestion de la cadence', options: ['Insuffisante', 'À consolider', 'Adaptée', 'Très bonne'] },
  { key: 'qualite', label: 'Qualité et fiabilité du travail', options: ['Insuffisante', 'Irrégulière', 'Satisfaisante', 'Très satisfaisante'] },
  { key: 'comportement', label: "Comportement et intégration dans l'équipe", options: ['Insuffisants', 'À consolider', 'Satisfaisants', 'Très satisfaisants'] },
  { key: 'employabilite', label: 'Employabilité immédiate sur le poste visé', options: ['Non', "Sous réserve d'accompagnement", 'Oui', 'Oui, avec autonomie'] },
]

export const AVIS_FINAL = ['AVIS FAVORABLE', 'AVIS FAVORABLE AVEC RÉSERVES', 'AVIS DÉFAVORABLE'] as const

export const ALL_ITEMS = GRILLE_SECTIONS.flatMap((s) => s.items)

/** Progression : % d'items acquis (A) et évalués, pour une grille remplie. */
export function grilleProgress(items: Record<string, { n?: NiveauAcquis }> | null | undefined) {
  const total = ALL_ITEMS.length
  const vals = ALL_ITEMS.map((i) => items?.[i.id]?.n).filter(Boolean) as NiveauAcquis[]
  const acquis = vals.filter((v) => v === 'A').length
  const encours = vals.filter((v) => v === 'EC').length
  return { total, evalues: vals.length, acquis, encours, pctEvalue: Math.round((vals.length / total) * 100), pctAcquis: Math.round((acquis / total) * 100) }
}
