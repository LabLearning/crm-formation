/**
 * Référentiel des points de contrôle des audits hygiène.
 *
 * COPIE du référentiel de l'application AuditHygiène Pro
 * (LabLearning/audithygiene → lib/audit-data.ts). Les réponses stockées dans
 * `ah_audits.answers` sont indexées par `{section}_{ref}` (ex. « s0_L1 ») :
 * sans ce référentiel, le détail d'un audit est illisible côté CRM.
 *
 * À resynchroniser si la grille d'audit évolue dans l'outil terrain. Une clé
 * inconnue est affichée telle quelle plutôt que masquée, pour qu'un décalage se
 * voie immédiatement au lieu de faire disparaître des points de contrôle.
 */

export interface CtrlPoint {
  ref: string
  label: string
  critical?: boolean
}
export interface AuditSection {
  id: string
  title: string
  icon: string
  points: CtrlPoint[]
}

export const SECTIONS: AuditSection[] = [
  { id: 's0', title: 'Locaux', icon: '🏭', points: [
    { ref: 'L1', label: 'Sol en bon état, propre et non glissant', critical: true },
    { ref: 'L2', label: 'Murs et plafonds propres, sans moisissures ni fissures' },
    { ref: 'L3', label: 'Éclairage suffisant et protégé (ampoules sécurisées)' },
    { ref: 'L4', label: 'Ventilation et VMC fonctionnelle, grilles propres' },
    { ref: 'L5', label: 'Vestiaires séparés, propres et verrouillables' },
    { ref: 'L6', label: 'Sanitaires séparés de la zone de travail, entretenus', critical: true },
    { ref: 'L7', label: 'Absence de nuisibles ou traces visibles', critical: true },
    { ref: 'L8', label: 'Sas ou double porte à l\'entrée cuisine (marche en avant)' },
    { ref: 'L9', label: 'Zone de déchets séparée et couverte' },
    { ref: 'L10', label: 'Accès sécurisé aux zones sensibles' },
  ]},
  { id: 's1', title: 'Équipements', icon: '🔧', points: [
    { ref: 'E1', label: 'Frigos et congélateurs en bon état de marche, températures conformes', critical: true },
    { ref: 'E2', label: 'Thermomètres calibrés disponibles et utilisés' },
    { ref: 'E3', label: 'Hottes propres, filtres nettoyés et entretenus', critical: true },
    { ref: 'E4', label: 'Plans de travail en inox ou matériau lisse, sans rayures profondes' },
    { ref: 'E5', label: 'Matériel de découpe (planches, couteaux) en bon état et identifié par couleur' },
    { ref: 'E6', label: 'Lave-vaisselle ou bac de plonge à température réglementaire (≥ 82°C)' },
    { ref: 'E7', label: 'Poubelles avec couvercle et commande non manuelle' },
    { ref: 'E8', label: 'Équipements électriques conformes, sans câbles dénudés', critical: true },
    { ref: 'E9', label: 'Absence de matériaux interdits (bois non autorisé, verre dans cuisine…)' },
    { ref: 'E10', label: 'Matériel de cuisson en bon état, joints propres' },
  ]},
  { id: 's2', title: 'Hygiène du personnel', icon: '👷', points: [
    { ref: 'H1', label: 'Tenue complète propre et adaptée (blouse, tablier, coiffe)', critical: true },
    { ref: 'H2', label: 'Lavage des mains fréquent et technique correcte', critical: true },
    { ref: 'H3', label: 'Lave-mains dédié disponible avec savon et essuie-mains à usage unique' },
    { ref: 'H4', label: 'Ongles courts, pas de bijoux ni montre en cuisine', critical: true },
    { ref: 'H5', label: 'Absence de manipulation téléphone ou visage en zone alimentaire' },
    { ref: 'H6', label: 'Personnel formé aux bonnes pratiques d\'hygiène (attestation)' },
    { ref: 'H7', label: 'Signalement des blessures, plaies couvertes (pansement bleu)' },
    { ref: 'H8', label: 'Personnel malade écarté des zones de production', critical: true },
    { ref: 'H9', label: 'Tenue de ville non portée en cuisine' },
  ]},
  { id: 's3', title: 'Matières premières', icon: '📦', points: [
    { ref: 'M1', label: 'Contrôle des livraisons : DLC, températures, aspect', critical: true },
    { ref: 'M2', label: 'Produits stockés à bonne température et dans des contenants adaptés' },
    { ref: 'M3', label: 'Respect de la rotation FIFO (Premier Entré / Premier Sorti)' },
    { ref: 'M4', label: 'Étiquetage des produits déconditionnés (date, nature)', critical: true },
    { ref: 'M5', label: 'Séparation physique cru / cuit / allergènes' },
    { ref: 'M6', label: 'Absence de produits périmés ou altérés', critical: true },
    { ref: 'M7', label: 'Liste des allergènes à jour et accessible' },
    { ref: 'M8', label: 'Registre de réception tenu à jour' },
    { ref: 'M9', label: 'Produits chimiques séparés des denrées alimentaires', critical: true },
  ]},
  { id: 's4', title: 'Températures', icon: '🌡️', points: [
    { ref: 'T1', label: 'Froid positif ≤ +4°C (viandes, poissons, produits frais)', critical: true },
    { ref: 'T2', label: 'Froid négatif ≤ -18°C (surgelés)', critical: true },
    { ref: 'T3', label: 'Cuisson ≥ +63°C à cœur', critical: true },
    { ref: 'T4', label: 'Refroidissement rapide ≤ 2h de +63 à +10°C', critical: true },
    { ref: 'T5', label: 'Relevés de températures effectués et enregistrés' },
    { ref: 'T6', label: 'Remise en température ≥ +63°C effectuée rapidement' },
    { ref: 'T7', label: 'Pas de rupture de chaîne de froid constatée' },
    { ref: 'T8', label: 'Affichage des températures cibles visible en cuisine' },
  ]},
  { id: 's5', title: 'Nettoyage & Désinfection', icon: '🧹', points: [
    { ref: 'N1', label: 'Plan de nettoyage-désinfection formalisé et respecté', critical: true },
    { ref: 'N2', label: 'Produits nettoyants et désinfectants homologués alimentaires' },
    { ref: 'N3', label: 'Protocole nettoyage en place (NEP) pour le matériel fixe' },
    { ref: 'N4', label: 'Registre de nettoyage tenu à jour et signé' },
    { ref: 'N5', label: 'État de propreté général satisfaisant de la cuisine' },
    { ref: 'N6', label: 'Sols, murs, surfaces de contact propres' },
    { ref: 'N7', label: 'Bacs de plonge propres, eau changée régulièrement' },
    { ref: 'N8', label: 'Chiffons et lavettes changés ou désinfectés régulièrement' },
    { ref: 'N9', label: 'Hottes et bouches d\'aération propres' },
  ]},
  { id: 's6', title: 'Nuisibles & Déchets', icon: '🐛', points: [
    { ref: 'Nu1', label: 'Contrat de dératisation/désinsectisation actif', critical: true },
    { ref: 'Nu2', label: 'Absence de traces de nuisibles (rongeurs, blattes, mouches)' },
    { ref: 'Nu3', label: 'Grilles et protections anti-nuisibles aux ouvertures' },
    { ref: 'Nu4', label: 'Poubelles vidées régulièrement, lavées et désinfectées' },
    { ref: 'Nu5', label: 'Zone de déchets propre, éloignée des zones de production' },
    { ref: 'Nu6', label: 'Tri des déchets respecté (emballages, huiles, organiques)' },
    { ref: 'Nu7', label: 'Contrat collecteur d\'huiles usagées si friteuse', },
    { ref: 'Nu8', label: 'Registre intervention nuisibles tenu à jour' },
  ]},
  { id: 's7', title: 'Traçabilité', icon: '📋', points: [
    { ref: 'Tr1', label: 'Documents de traçabilité en entrée (BL fournisseurs conservés)', critical: true },
    { ref: 'Tr2', label: 'Étiquettes DLC/DLUO conservées (coquilles, sachets)', critical: true },
    { ref: 'Tr3', label: 'Enregistrement des températures à réception et en cours' },
    { ref: 'Tr4', label: 'PMS (Plan de Maîtrise Sanitaire) présent et à jour' },
    { ref: 'Tr5', label: 'Fiches de non-conformités renseignées si écart constaté' },
    { ref: 'Tr6', label: 'Registre de nettoyage signé et daté' },
    { ref: 'Tr7', label: 'Procédures écrites accessibles au personnel' },
    { ref: 'Tr8', label: 'Traçabilité des allergènes documentée' },
  ]},
]

export const CHECKLISTS_BY_TYPE: Record<string, { section: string; items: { id: string; label: string }[] }[]> = {
  'Restaurant / Restauration rapide': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'Contrat de dératisation / désinsectisation' },
      { id: 'cl_h2', label: "Contrat d'analyse alimentaire (laboratoire agréé, 1×/trimestre)" },
      { id: 'cl_h3', label: "Contrat avec un collecteur d'huile usagée (si friteuse)" },
      { id: 'cl_h4', label: "Présence d'un PMS (papier ou logiciel)" },
      { id: 'cl_h5', label: 'Liste des allergènes affichée' },
      { id: 'cl_h6', label: 'Affichage des origines des viandes' },
      { id: 'cl_h7', label: 'Attestation de formation HACCP' },
      { id: 'cl_h_excl', label: "Affichage des consignes d'éviction du personnel en cas de maladie contagieuse (gastro, fièvre, plaies infectées, hépatite A)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Contrat vérification annuelle des installations électriques' },
      { id: 'cl_s2', label: "Contrat de vérification de l'étanchéité des circuits frigorifiques" },
      { id: 'cl_s3', label: 'Contrat de vérification annuelle des extincteurs' },
      { id: 'cl_s4', label: 'Attestation de formation incendie (tous les 6 mois)' },
      { id: 'cl_s5', label: 'Attestation de ramonage des hottes de cuisine' },
      { id: 'cl_s6', label: "Fiches de Données de Sécurité (FDS) accessibles pour tous les produits chimiques" },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail (SIR si exposition CMR/biologique)" },
      { id: 'cl_s7', label: "DUERP (Document Unique d'Évaluation des Risques Professionnels)" },
    ]},
  ],
  'Boulangerie / Pâtisserie': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'Contrat de dératisation / désinsectisation' },
      { id: 'cl_h2', label: "Contrat d'analyse alimentaire (eau, surfaces, produits finis)" },
      { id: 'cl_h3', label: "Présence d'un PMS (plan de maîtrise sanitaire)" },
      { id: 'cl_h4', label: 'Liste des allergènes affichée (gluten, œufs, lait, fruits à coque…)' },
      { id: 'cl_h5', label: 'Traçabilité fournisseurs (farine, beurre, œufs, lait)' },
      { id: 'cl_h6', label: 'Registre des températures de cuisson et conservation' },
      { id: 'cl_h7', label: 'Œufs pasteurisés ou chaîne du froid maîtrisée pour crèmes' },
      { id: 'cl_h8', label: 'Attestation de formation HACCP' },
      { id: 'cl_h_excl', label: "Affichage des consignes d'éviction du personnel en cas de maladie contagieuse (gastro, fièvre, plaies infectées, hépatite A)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Vérification annuelle des installations électriques (Q18)' },
      { id: 'cl_s2', label: 'Vérification annuelle installation gaz et fours' },
      { id: 'cl_s3', label: 'Vérification annuelle des extincteurs (eau + CO2)' },
      { id: 'cl_s4', label: 'Vérification grille de sécurité du pétrin (contact à l\'ouverture)' },
      { id: 'cl_s5', label: 'Captage des poussières de farine au pétrin (prévention asthme TMP 66/11)' },
      { id: 'cl_s6', label: 'Masques FFP3 et gants nitrile longs disponibles' },
      { id: 'cl_s7', label: 'Attestation de formation incendie + plan d\'évacuation' },
      { id: 'cl_s8', label: 'Surveillance médicale renforcée des travailleurs de nuit' },
      { id: 'cl_s9', label: "Fiches de Données de Sécurité (FDS) accessibles pour tous les produits chimiques + dosage auto plonge" },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail (SIR farines + nuit)" },
      { id: 'cl_s10', label: 'Alarme PTI / procédure travail isolé à l\'ouverture' },
      { id: 'cl_s11', label: "DUERP à jour (révision annuelle)" },
    ]},
  ],
  'Traiteur / Cuisine centrale': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'Contrat de dératisation / désinsectisation' },
      { id: 'cl_h2', label: "Contrat d'analyse alimentaire (mensuel recommandé)" },
      { id: 'cl_h3', label: "Contrat collecteur d'huile usagée" },
      { id: 'cl_h4', label: "Présence d'un PMS complet (HACCP, traçabilité, nettoyage)" },
      { id: 'cl_h5', label: 'Liste des 14 allergènes affichée et postes dédiés' },
      { id: 'cl_h6', label: 'Affichage des origines des viandes' },
      { id: 'cl_h7', label: 'Cellule de refroidissement rapide (passage <10°C en <2h)' },
      { id: 'cl_h8', label: 'Traçabilité T° H24 (chambres froides, cellule, transport)' },
      { id: 'cl_h9', label: 'Attestation de formation HACCP de tous les personnels' },
      { id: 'cl_h_excl', label: "Affichage des consignes d'éviction du personnel en cas de maladie contagieuse (gastro, fièvre, plaies infectées, hépatite A)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Vérification annuelle des installations électriques (Q18)' },
      { id: 'cl_s2', label: "Vérification étanchéité des circuits frigorifiques" },
      { id: 'cl_s3', label: 'Vérification annuelle des engins de manutention (transpalette, gerbeur)' },
      { id: 'cl_s4', label: 'CACES R.485 si transpalette électrique autoporté' },
      { id: 'cl_s5', label: 'Vérification annuelle rayonnages (NF EN 15635) + charges max affichées' },
      { id: 'cl_s6', label: 'Dispositif d\'ouverture intérieure des chambres froides + voyant occupation' },
      { id: 'cl_s7', label: 'Test mensuel du déverrouillage intérieur (tracé)' },
      { id: 'cl_s8', label: 'Extincteurs vérifiés annuellement (eau + CO2 + classe F friteuse)' },
      { id: 'cl_s9', label: 'Attestation ramonage hottes + bac à graisse' },
      { id: 'cl_s10', label: 'Attestation de formation incendie + plan d\'évacuation' },
      { id: 'cl_s11', label: "Fiches de Données de Sécurité (FDS) accessibles pour tous les produits chimiques + interdiction mélanges" },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail" },
      { id: 'cl_s12', label: "DUERP à jour (révision annuelle)" },
    ]},
  ],
  'Épicerie / Commerce alimentaire': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'Contrat de dératisation / désinsectisation' },
      { id: 'cl_h2', label: "Présence d'un PMS adapté au commerce de détail (rayon trad notamment)" },
      { id: 'cl_h3', label: 'Liste des allergènes affichée (vrac, traiteur, charcuterie)' },
      { id: 'cl_h4', label: 'Étiquetage réglementaire des produits (DLC / DDM visibles)' },
      { id: 'cl_h5', label: 'Relevés de températures (rayon frais ≤ 4°C, surgelés ≤ -18°C)' },
      { id: 'cl_h6', label: 'Traçabilité fournisseurs (rayon trad : viande, fromage, traiteur)' },
      { id: 'cl_h7', label: 'Attestation de formation HACCP' },
      { id: 'cl_h8', label: 'Plan de nettoyage et désinfection affiché et tenu' },
      { id: 'cl_h_excl', label: "Affichage des consignes d'éviction du personnel en cas de maladie contagieuse (gastro, fièvre, plaies infectées, hépatite A)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Vérification annuelle des installations électriques (Q18)' },
      { id: 'cl_s2', label: "Vérification de l'étanchéité des circuits frigorifiques" },
      { id: 'cl_s3', label: 'Vérification annuelle des extincteurs' },
      { id: 'cl_s4', label: 'Vérification annuelle des rayonnages (NF EN 15635) + charges max affichées' },
      { id: 'cl_s5', label: 'Vérification annuelle des engins de manutention (transpalette électrique, gerbeur)' },
      { id: 'cl_s6', label: 'CACES R.485 si transpalette électrique à conducteur accompagnant' },
      { id: 'cl_s7', label: 'Attestation de formation incendie + plan d\'évacuation affiché' },
      { id: 'cl_s8', label: "Coffre temporisé + procédure dépôt bancaire (anti hold-up)" },
      { id: 'cl_s9', label: "Fiches de Données de Sécurité (FDS) accessibles pour tous les produits chimiques + interdiction mélanges (javel + acide)" },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail" },
      { id: 'cl_s10', label: "Alarme PTI / procédure travail isolé (ouverture/fermeture)" },
      { id: 'cl_s11', label: "DUERP à jour (révision annuelle)" },
    ]},
  ],
  'Hôtel avec restauration': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'Contrat de dératisation / désinsectisation' },
      { id: 'cl_h2', label: "Contrat d'analyse alimentaire laboratoire agréé" },
      { id: 'cl_h3', label: "Contrat collecteur d'huile usagée (si friteuse)" },
      { id: 'cl_h4', label: "Présence d'un PMS (cuisine + petit-déjeuner buffet)" },
      { id: 'cl_h5', label: 'Liste des 14 allergènes affichée + écrans anti-éternuements buffet' },
      { id: 'cl_h6', label: 'Attestation de formation HACCP du personnel de cuisine' },
      { id: 'cl_h7', label: 'Registre des températures frigos et buffets' },
      { id: 'cl_h8', label: 'Analyse Legionella annuelle (réseaux ECS) + T° >55°C tous points' },
      { id: 'cl_h9', label: 'Plan de gestion eau et contrôles piscine/spa (chlore, pH, fréquentation)' },
      { id: 'cl_h_excl', label: "Affichage des consignes d'éviction du personnel en cas de maladie contagieuse (gastro, fièvre, plaies infectées, hépatite A)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Vérification annuelle des installations électriques (Q18)' },
      { id: 'cl_s2', label: "Vérification de l'étanchéité des circuits frigorifiques" },
      { id: 'cl_s3', label: 'Vérification SSI (Système Sécurité Incendie) annuelle — ERP type O' },
      { id: 'cl_s4', label: 'Exercice d\'évacuation annuel + registre + formation veilleur nuit' },
      { id: 'cl_s5', label: 'Extincteurs vérifiés annuellement (eau + CO2 + classe F cuisine)' },
      { id: 'cl_s6', label: 'Attestation ramonage hottes de cuisine' },
      { id: 'cl_s7', label: 'Consignes incendie affichées dans chaque chambre' },
      { id: 'cl_s8', label: 'Lits à hauteur réglable (étages) + aspirateurs ergonomiques' },
      { id: 'cl_s9', label: 'Alarme PTI veilleur de nuit + procédure travail isolé' },
      { id: 'cl_s10', label: 'Vaccination hépatite B des femmes/valets de chambre (AES linge souillé)' },
      { id: 'cl_s11', label: "Fiches de Données de Sécurité (FDS) accessibles pour tous les produits chimiques + interdiction mélanges" },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail (SIR veilleurs de nuit + AES)" },
      { id: 'cl_s12', label: "DUERP à jour (révision annuelle)" },
    ]},
  ],
  'Collectivité / Cantine': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'Contrat de dératisation / désinsectisation' },
      { id: 'cl_h2', label: "Contrat d'analyse alimentaire (fréquence renforcée obligatoire)" },
      { id: 'cl_h3', label: "Contrat collecteur d'huile usagée" },
      { id: 'cl_h4', label: "Présence d'un PMS complet et révisé" },
      { id: 'cl_h5', label: 'Plan de gestion des 14 allergènes + PAI tracés (enfants allergiques)' },
      { id: 'cl_h6', label: 'Attestation de formation HACCP de tout le personnel de cuisine' },
      { id: 'cl_h7', label: 'Cellule de refroidissement rapide (passage <10°C en <2h)' },
      { id: 'cl_h8', label: 'Traçabilité T° H24 (chambres froides, cellule, liaison chaude/froide)' },
      { id: 'cl_h9', label: 'Plats témoins conservés 5 jours' },
      { id: 'cl_h10', label: 'Plan de nettoyage et désinfection formalisé + prélèvements bactériologiques' },
      { id: 'cl_h_excl', label: "Affichage des consignes d'éviction du personnel en cas de maladie contagieuse (gastro, fièvre, plaies infectées, hépatite A)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Vérification annuelle des installations électriques (Q18)' },
      { id: 'cl_s2', label: "Vérification de l'étanchéité des circuits frigorifiques" },
      { id: 'cl_s3', label: 'Vérification SSI + désenfumage (ERP type R scolaire / U sanitaire)' },
      { id: 'cl_s4', label: 'Exercices d\'évacuation 2×/an adaptés au public sensible (enfants, PMR)' },
      { id: 'cl_s5', label: 'Extincteurs vérifiés annuellement (eau + CO2 + classe F friteuse)' },
      { id: 'cl_s6', label: 'Attestation ramonage hottes' },
      { id: 'cl_s7', label: 'Dispositif d\'ouverture intérieure chambres froides + test mensuel tracé' },
      { id: 'cl_s8', label: 'Vérification annuelle équipements (trancheuse, hachoir, robot)' },
      { id: 'cl_s9', label: 'CACES R.485 si transpalette électrique' },
      { id: 'cl_s10', label: 'Formation SST + manœuvre de Heimlich (encadrement convives)' },
      { id: 'cl_s11', label: "Fiches de Données de Sécurité (FDS) accessibles pour tous les produits chimiques + interdiction mélanges" },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail" },
      { id: 'cl_s12', label: "DUERP à jour (révision annuelle)" },
    ]},
  ],
  'Boucherie / Charcuterie': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'Contrat de dératisation / désinsectisation' },
      { id: 'cl_h2', label: "Contrat d'analyse alimentaire (laboratoire agréé, fréquence renforcée pour la viande)" },
      { id: 'cl_h3', label: "Présence d'un PMS (Plan de Maîtrise Sanitaire) spécifique viande" },
      { id: 'cl_h4', label: 'Traçabilité complète des viandes (lots, origine, fournisseurs, DLC)' },
      { id: 'cl_h5', label: 'Affichage obligatoire de l\'origine des viandes (R. 412-39 Code consommation)' },
      { id: 'cl_h6', label: 'Liste des allergènes affichée (charcuterie, marinades)' },
      { id: 'cl_h7', label: 'Attestation de formation HACCP' },
      { id: 'cl_h8', label: 'Plan de nettoyage et désinfection (laboratoire, ustensiles, billots)' },
      { id: 'cl_h9', label: 'Relevés de températures (chambre positive ≤ 4°C, négative ≤ -18°C, vitrine ≤ 4°C)' },
      { id: 'cl_h10', label: 'Contrat collecte et destruction des sous-produits animaux (SPAn cat. 3)' },
      { id: 'cl_h11', label: 'Agrément sanitaire ou dispense (selon volumes)' },
      { id: 'cl_h_excl', label: "Affichage des consignes d'éviction du personnel en cas de maladie contagieuse (gastro, fièvre, plaies infectées, hépatite A)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Contrat vérification annuelle des installations électriques' },
      { id: 'cl_s2', label: "Vérification annuelle des équipements de travail (hachoir, scie à os, trancheuse, poussoir) — VGP" },
      { id: 'cl_s3', label: "Contrat de vérification de l'étanchéité des circuits frigorifiques" },
      { id: 'cl_s4', label: 'Contrat de vérification annuelle des extincteurs' },
      { id: 'cl_s5', label: 'Attestation de formation incendie' },
      { id: 'cl_s6', label: "Fiches de Données de Sécurité (FDS) accessibles pour tous les produits chimiques (entretien, désinfectants)" },
      { id: 'cl_s7', label: 'Cottes de mailles et gants anti-coupure fournis et entretenus' },
      { id: 'cl_s8', label: 'Affichage des consignes de sécurité (utilisation hachoir, scie, couteau)' },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail (SIR jeunes travailleurs sur trancheuse/scie)" },
      { id: 'cl_s9', label: "DUERP à jour (révision annuelle)" },
    ]},
  ],
  'Coiffure / Barbier / Esthétique': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'FDS des produits chimiques accessibles (colorations, décolorations, lissages)' },
      { id: 'cl_h2', label: "Étiquetage CLP conforme sur tous contenants (y compris reconditionnés)" },
      { id: 'cl_h3', label: 'Registre de désinfection du matériel coupant (peignes, ciseaux, rasoirs)' },
      { id: 'cl_h4', label: 'Affichage des consignes hygiène (lavage mains, désinfection)' },
      { id: 'cl_h5', label: 'Protocole AES affiché (barbier — coupure / saignement client)' },
      { id: 'cl_h6', label: 'Vaccination hépatite B du personnel (barbier)' },
      { id: 'cl_h7', label: 'Ventilation / VMC fonctionnelle dans espace technique' },
      { id: 'cl_h8', label: 'Stockage produits chimiques séparé et ventilé' },
      { id: 'cl_h_excl', label: "Affichage du protocole d'éviction du personnel en cas de maladie contagieuse (gastro, plaies infectées, hépatite)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Vérification annuelle des installations électriques (Q18)' },
      { id: 'cl_s2', label: "Différentiel 30 mA présent sur tous circuits (zones humides)" },
      { id: 'cl_s3', label: 'Vérification annuelle des extincteurs' },
      { id: 'cl_s4', label: 'Attestation de formation SST (au moins 1 personne)' },
      { id: 'cl_s5', label: 'Gants nitrile longs disponibles en quantité suffisante' },
      { id: 'cl_s6', label: 'Crème barrière et crème réparatrice mains disponibles' },
      { id: 'cl_s7', label: 'Fauteuils hydrauliques réglables et tapis anti-fatigue' },
      { id: 'cl_s8', label: 'Bacs de shampouinage ergonomiques (inclinables, hauteur réglable)' },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail (SIR exposition CMR colorations/lissages)" },
      { id: 'cl_s9', label: "DUERP à jour (révision annuelle)" },
    ]},
  ],
  'Pressing / Blanchisserie': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'Conformité ICPE rubrique 2345 (perchloroéthylène) ou 2346 (autres solvants)' },
      { id: 'cl_h2', label: 'Machine de nettoyage à sec 5e génération étanche (si perchlo)' },
      { id: 'cl_h3', label: 'Mesurage VLEP atmosphère annuel (si CMR — perchlo, solvants)' },
      { id: 'cl_h4', label: 'FDS de tous solvants, détachants et lessives accessibles' },
      { id: 'cl_h5', label: 'Marche en avant linge sale / linge propre (RABC NF EN 14065 si linge santé)' },
      { id: 'cl_h6', label: 'Vaccination hépatite B du personnel triant le linge sale' },
      { id: 'cl_h7', label: 'Plan de nettoyage des machines et locaux' },
      { id: 'cl_h8', label: 'Stockage solvants séparé et ventilé' },
      { id: 'cl_h_excl', label: "Affichage du protocole d'éviction du personnel en cas de maladie contagieuse (linge contaminé hospitalier)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Vérification annuelle des installations électriques (Q18)' },
      { id: 'cl_s2', label: "Vérification ESP (chaudière vapeur) à jour" },
      { id: 'cl_s3', label: 'Zonage ATEX et DRPCE si solvants inflammables (KWL, hydrocarbures)' },
      { id: 'cl_s4', label: 'Vérification annuelle des extincteurs' },
      { id: 'cl_s5', label: 'EPI : gants chimiques (nitrile/butyle), lunettes, masques, PICB' },
      { id: 'cl_s6', label: 'Douche de sécurité + rince-œil si stockage chimiques importants' },
      { id: 'cl_s7', label: 'Barres sensitives sur calandres et tables aspirantes' },
      { id: 'cl_s8', label: 'Trousse de secours + au moins 1 SST formé' },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + SIR (suivi individuel renforcé) — exposition CMR perchlo, bruit, chaleur" },
      { id: 'cl_s9', label: "DUERP à jour avec mention CMR (révision annuelle)" },
    ]},
  ],
  'Bar / Brasserie / Café': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'PMS / HACCP rédigé et tenu à jour (snacks, denrées)' },
      { id: 'cl_h2', label: 'Plan de nettoyage-désinfection (bar, plonge, sanitaires)' },
      { id: 'cl_h3', label: 'Relevés de températures (vitrines réfrigérées, frigo bar)' },
      { id: 'cl_h4', label: 'Traçabilité fournisseurs (boissons, denrées snacks)' },
      { id: 'cl_h5', label: 'Affichages : interdiction fumer/vapoter, mineurs, ivresse manifeste' },
      { id: 'cl_h6', label: 'Affichage des prix des consommations' },
      { id: 'cl_h7', label: "Fiches de Données de Sécurité (FDS) accessibles + dosage automatique plonge" },
      { id: 'cl_h8', label: 'Attestation de formation HACCP (si snacks)' },
      { id: 'cl_h_excl', label: "Affichage des consignes d'éviction du personnel en cas de maladie contagieuse (gastro, fièvre, plaies infectées, hépatite A)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Vérification annuelle des installations électriques (Q18)' },
      { id: 'cl_s2', label: 'Vérification annuelle installation gaz' },
      { id: 'cl_s3', label: 'Cave CO2 ventilée + détecteur si sous-sol, bouteilles fixées' },
      { id: 'cl_s4', label: 'Extincteurs (eau + CO2 + CLASSE F en cuisine) vérifiés annuellement' },
      { id: 'cl_s5', label: 'Couverture anti-feu et hotte avec bac à graisses (cuisine)' },
      { id: 'cl_s6', label: 'Limiteur de pression acoustique (musique amplifiée — décret 2017-1244)' },
      { id: 'cl_s7', label: 'Procédure de fermeture (binôme, dépôt bancaire fréquent)' },
      { id: 'cl_s8', label: 'Registre de sécurité ERP à jour' },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail (SIR travail de nuit)" },
      { id: 'cl_s9', label: "DUERP à jour avec mention horaires atypiques (révision annuelle)" },
    ]},
  ],
  'Poissonnerie / Marée': [
    { section: 'Hygiène', items: [
      { id: 'cl_h1', label: 'PMS / HACCP rédigé et plan de nettoyage-désinfection affiché' },
      { id: 'cl_h2', label: 'Agrément sanitaire ou dispense (selon volumes et transformation)' },
      { id: 'cl_h3', label: 'Traçabilité complète (lots, origine, criée, dates de capture)' },
      { id: 'cl_h4', label: 'Affichage des origines et noms scientifiques des espèces' },
      { id: 'cl_h5', label: 'Liste des allergènes affichée (crustacés, mollusques, poissons)' },
      { id: 'cl_h6', label: 'Relevés de températures (étal ≤ 4°C, chambres ≤ 2°C / -18°C)' },
      { id: 'cl_h7', label: 'Évacuation des déchets en froid et contrat enlèvement' },
      { id: 'cl_h8', label: 'Attestation de formation HACCP' },
      { id: 'cl_h_excl', label: "Affichage des consignes d'éviction du personnel en cas de maladie contagieuse (gastro, fièvre, plaies infectées, hépatite A)" },
    ]},
    { section: 'Sécurité', items: [
      { id: 'cl_s1', label: 'Dispositif d\'ouverture intérieure des chambres froides + voyant occupation' },
      { id: 'cl_s2', label: 'Test mensuel du déverrouillage intérieur (tracé)' },
      { id: 'cl_s3', label: 'Vérification annuelle des installations électriques (Q18) — IP54/65' },
      { id: 'cl_s4', label: 'Vérification annuelle des équipements (trancheuse, scie, machines à fileter)' },
      { id: 'cl_s5', label: 'Cottes de mailles et gants Kevlar fournis et entretenus' },
      { id: 'cl_s6', label: 'Vêtements grand froid et chaussures S2/S3 antidérapantes' },
      { id: 'cl_s7', label: "Fiches de Données de Sécurité (FDS) accessibles pour tous les produits chimiques + dosage maîtrisé" },
      { id: 'cl_s8', label: 'Kit eau chaude pour piqûres de vive + vaccination tétanos à jour' },
      { id: 'cl_s_visite_med', label: "Visite médicale d'embauche + suivi périodique par le médecin du travail (SIR travail au froid + biologique)" },
      { id: 'cl_s9', label: "DUERP à jour (révision annuelle)" },
    ]},
  ],
}

/** Points de contrôle indexés par la clé utilisée dans `answers`. */
export const POINTS_PAR_CLE: Record<string, { section: string; ref: string; label: string; critical: boolean }> =
  Object.fromEntries(
    SECTIONS.flatMap((s) =>
      s.points.map((p) => [`${s.id}_${p.ref}`, { section: s.title, ref: p.ref, label: p.label, critical: !!p.critical }]),
    ),
  )

/** Libellés de la checklist, tous types d'établissement confondus. */
export const CHECKLIST_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(CHECKLISTS_BY_TYPE).flatMap((groupes) =>
    groupes.flatMap((g) => g.items.map((i) => [i.id, i.label])),
  ),
)

/**
 * Résout une clé de réponse en point de contrôle.
 *
 * La grille de l'outil a évolué début mai 2026 : les audits antérieurs portent
 * des clés d'une version précédente (« s7_TR1 » là où la grille dit « s7_Tr1 »,
 * sections « s2_P* » et « s6_D* » disparues). On tente donc la clé exacte, puis
 * la même clé sans tenir compte de la casse, puis la seule référence — elles
 * sont uniques dans la grille. Ce qui reste introuvable est signalé, jamais
 * masqué.
 */
const PAR_CLE_MINUSCULE: Record<string, string> = Object.fromEntries(
  Object.keys(POINTS_PAR_CLE).map((k) => [k.toLowerCase(), k]),
)
const PAR_REF_MINUSCULE: Record<string, string> = Object.fromEntries(
  Object.entries(POINTS_PAR_CLE).map(([k, p]) => [p.ref.toLowerCase(), k]),
)

export function pointDe(cle: string) {
  if (POINTS_PAR_CLE[cle]) return POINTS_PAR_CLE[cle]
  const parCasse = PAR_CLE_MINUSCULE[cle.toLowerCase()]
  if (parCasse) return POINTS_PAR_CLE[parCasse]
  const ref = cle.split('_').slice(1).join('_').toLowerCase()
  const parRef = PAR_REF_MINUSCULE[ref]
  if (parRef) return POINTS_PAR_CLE[parRef]
  return null
}

export const VALEURS: Record<string, { label: string; couleur: string }> = {
  ok: { label: 'Conforme', couleur: '#16a34a' },
  warn: { label: 'À améliorer', couleur: '#d97706' },
  ko: { label: 'Non conforme', couleur: '#dc2626' },
  na: { label: 'Non applicable', couleur: '#a8a29e' },
}
