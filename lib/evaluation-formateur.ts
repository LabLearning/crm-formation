/**
 * Les compétences évaluées pour chaque formateur — la trame de la fiche
 * d'évaluation transmise à l'audit blanc (indicateur 21), notée de 1 à 5.
 * Les clés sont stables : elles indexent le jsonb `formateur_evaluations.notes`.
 */
export const COMPETENCES_FORMATEUR: { cle: string; label: string }[] = [
  { cle: 'analyse_demande', label: "Analyser une demande de formation et élaborer le cahier des charges" },
  { cle: 'conception', label: "Concevoir une formation présentielle (objectifs pédagogiques, scénario, supports)" },
  { cle: 'animation', label: "Animer une séance avec des techniques actives, attractives et digitales" },
  { cle: 'suivi_terrain', label: "Suivre l'application des connaissances après la formation, sur le terrain" },
  { cle: 'tutorat', label: "Préparer un itinéraire de formation au poste de travail (tutorat, mentorat)" },
  { cle: 'accompagnement_poste', label: "Accompagner et former un apprenant au poste de travail" },
  { cle: 'digital', label: "Concevoir des objets de formation digitalisés (e-learning, vidéo…)" },
  { cle: 'reussite', label: "Aider les stagiaires à atteindre leurs objectifs" },
  { cle: 'evaluation', label: "Évaluer et valider les compétences en amont et en aval d'un parcours" },
  { cle: 'qualite', label: "Respecter les exigences du référentiel qualité" },
]
