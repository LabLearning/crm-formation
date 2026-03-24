-- ============================================================
-- MODULE 8 : CONFORMITÉ QUALIOPI & RÉCLAMATIONS
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE conformite_niveau AS ENUM (
  'conforme',
  'partiellement_conforme',
  'non_conforme',
  'non_applicable',
  'non_evalue'
);

CREATE TYPE reclamation_status AS ENUM (
  'recue',
  'en_analyse',
  'action_corrective',
  'cloturee'
);

CREATE TYPE reclamation_origine AS ENUM (
  'apprenant',
  'entreprise',
  'financeur',
  'formateur',
  'interne',
  'autre'
);

CREATE TYPE action_status AS ENUM (
  'planifiee',
  'en_cours',
  'realisee',
  'verifiee',
  'abandonnee'
);

CREATE TYPE action_priorite AS ENUM (
  'basse',
  'moyenne',
  'haute',
  'critique'
);

-- ============================================================
-- TABLE : qualiopi_indicateurs (32 indicateurs)
-- ============================================================

CREATE TABLE qualiopi_indicateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Identification
  critere INTEGER NOT NULL, -- 1 à 7
  indicateur INTEGER NOT NULL, -- 1 à 32
  libelle TEXT NOT NULL,
  description TEXT,
  -- Évaluation
  niveau conformite_niveau NOT NULL DEFAULT 'non_evalue',
  commentaire TEXT,
  date_evaluation DATE,
  evalue_par UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Preuve
  preuves_attendues TEXT, -- Description des preuves nécessaires
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, critere, indicateur)
);

CREATE INDEX idx_qualiopi_org ON qualiopi_indicateurs(organization_id);
CREATE INDEX idx_qualiopi_critere ON qualiopi_indicateurs(organization_id, critere);

CREATE TRIGGER tr_qualiopi_updated_at
  BEFORE UPDATE ON qualiopi_indicateurs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : qualiopi_preuves
-- ============================================================

CREATE TABLE qualiopi_preuves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicateur_id UUID NOT NULL REFERENCES qualiopi_indicateurs(id) ON DELETE CASCADE,
  -- Preuve
  titre TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'document', -- document, donnee, processus, lien
  -- Fichier ou lien
  document_url TEXT,
  lien_externe TEXT,
  -- Entité liée (preuve automatique)
  entity_type TEXT, -- 'formation', 'session', 'evaluation', etc.
  entity_id UUID,
  -- Validité
  date_preuve DATE DEFAULT CURRENT_DATE,
  est_valide BOOLEAN DEFAULT true,
  valide_par UUID REFERENCES users(id) ON DELETE SET NULL,
  date_validation TIMESTAMPTZ,
  -- Meta
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_preuves_indicateur ON qualiopi_preuves(indicateur_id);
CREATE INDEX idx_preuves_org ON qualiopi_preuves(organization_id);

-- ============================================================
-- TABLE : reclamations
-- ============================================================

CREATE TABLE reclamations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation
  numero TEXT NOT NULL,
  -- Identification
  objet TEXT NOT NULL,
  description TEXT NOT NULL,
  origine reclamation_origine NOT NULL DEFAULT 'apprenant',
  -- Émetteur
  emetteur_nom TEXT,
  emetteur_email TEXT,
  emetteur_telephone TEXT,
  apprenant_id UUID REFERENCES apprenants(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Statut
  status reclamation_status NOT NULL DEFAULT 'recue',
  priorite action_priorite DEFAULT 'moyenne',
  -- Traitement
  analyse TEXT,
  action_corrective TEXT,
  date_reception DATE DEFAULT CURRENT_DATE,
  date_analyse DATE,
  date_resolution DATE,
  date_cloture DATE,
  -- Assignation
  responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Satisfaction résolution
  resolution_satisfaisante BOOLEAN,
  commentaire_cloture TEXT,
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reclamations_org ON reclamations(organization_id);
CREATE INDEX idx_reclamations_status ON reclamations(organization_id, status);

CREATE TRIGGER tr_reclamations_updated_at
  BEFORE UPDATE ON reclamations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : actions_amelioration
-- ============================================================

CREATE TABLE actions_amelioration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Source
  titre TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'reclamation', -- reclamation, evaluation, audit, veille, interne
  reclamation_id UUID REFERENCES reclamations(id) ON DELETE SET NULL,
  indicateur_id UUID REFERENCES qualiopi_indicateurs(id) ON DELETE SET NULL,
  -- Planification
  status action_status NOT NULL DEFAULT 'planifiee',
  priorite action_priorite DEFAULT 'moyenne',
  responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date_planifiee DATE,
  date_echeance DATE,
  date_realisation DATE,
  date_verification DATE,
  -- Résultat
  resultat TEXT,
  efficacite TEXT, -- Évaluation de l'efficacité
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_actions_org ON actions_amelioration(organization_id);
CREATE INDEX idx_actions_status ON actions_amelioration(organization_id, status);
CREATE INDEX idx_actions_reclamation ON actions_amelioration(reclamation_id);

CREATE TRIGGER tr_actions_updated_at
  BEFORE UPDATE ON actions_amelioration FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION : seed 32 Qualiopi indicators
-- ============================================================

CREATE OR REPLACE FUNCTION seed_qualiopi_indicateurs(org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO qualiopi_indicateurs (organization_id, critere, indicateur, libelle, description, preuves_attendues) VALUES
  -- Critère 1 : Information du public
  (org_id, 1, 1, 'Information sur les prestations', 'Diffusion d''informations détaillées sur les prestations proposées', 'Catalogue, site web, fiches programmes'),
  (org_id, 1, 2, 'Indicateurs de résultats', 'Publication des indicateurs de résultats des prestations', 'Taux de satisfaction, taux de réussite, taux d''insertion'),
  (org_id, 1, 3, 'Obtention des certifications', 'Information sur les certifications et leur obtention', 'Fiches RNCP/RS, taux de certification'),
  -- Critère 2 : Objectifs et adaptation
  (org_id, 2, 4, 'Analyse du besoin', 'Analyse du besoin du bénéficiaire', 'Formulaires de recueil des besoins, comptes-rendus'),
  (org_id, 2, 5, 'Objectifs de la prestation', 'Définition des objectifs opérationnels et évaluables', 'Programmes avec objectifs, conventions'),
  (org_id, 2, 6, 'Contenus et modalités', 'Mise en œuvre et adaptation des contenus', 'Programmes détaillés, supports pédagogiques'),
  (org_id, 2, 7, 'Adéquation contenus/certification', 'Adéquation des contenus aux exigences de certification', 'Référentiels, grilles d''évaluation'),
  (org_id, 2, 8, 'Positionnement à l''entrée', 'Procédures de positionnement et d''évaluation des acquis', 'Tests de positionnement, résultats'),
  -- Critère 3 : Accompagnement
  (org_id, 3, 9, 'Conditions de déroulement', 'Information sur les conditions de déroulement', 'Convocations, livret d''accueil, règlement intérieur'),
  (org_id, 3, 10, 'Adaptation de la prestation', 'Adaptation de la prestation et accompagnement', 'Comptes-rendus, adaptations réalisées'),
  (org_id, 3, 11, 'Atteinte des objectifs', 'Évaluation de l''atteinte des objectifs', 'Résultats QCM, évaluations, attestations'),
  (org_id, 3, 12, 'Engagement des bénéficiaires', 'Engagement et prévention des ruptures', 'Suivi assiduité, relances, entretiens'),
  (org_id, 3, 13, 'Coordination des intervenants', 'Coordination des apprentissages entre intervenants', 'Réunions pédagogiques, plannings'),
  (org_id, 3, 14, 'Exercice de la citoyenneté', 'Information sur les droits et devoirs des stagiaires', 'Règlement intérieur, affichage obligatoire'),
  (org_id, 3, 15, 'Conseil en formation continue', 'Accompagnement socio-professionnel et orientation', 'Entretiens individuels, orientation'),
  (org_id, 3, 16, 'Accessibilité PSH', 'Accessibilité aux personnes en situation de handicap', 'Référent handicap, adaptations, partenariats'),
  -- Critère 4 : Moyens pédagogiques
  (org_id, 4, 17, 'Moyens humains et techniques', 'Adéquation des moyens pédagogiques et techniques', 'CV formateurs, inventaire matériel, locaux'),
  (org_id, 4, 18, 'Coordination des parties prenantes', 'Coordination des différents intervenants', 'Conventions, contrats, réunions'),
  (org_id, 4, 19, 'Ressources pédagogiques', 'Mise à disposition de ressources pédagogiques', 'Supports de cours, bibliothèque, plateforme LMS'),
  (org_id, 4, 20, 'Conditions favorables', 'Conditions de présentation des prestations favorables', 'Locaux, équipements, accessibilité'),
  -- Critère 5 : Qualification des intervenants
  (org_id, 5, 21, 'Compétences des intervenants', 'Qualification et compétences des formateurs', 'CV, diplômes, habilitations, veille'),
  (org_id, 5, 22, 'Développement des compétences', 'Développement professionnel des formateurs', 'Plans de formation, certifications obtenues'),
  -- Critère 6 : Environnement professionnel
  (org_id, 6, 23, 'Veille légale et réglementaire', 'Réalisation d''une veille réglementaire', 'Abonnements, comptes-rendus de veille'),
  (org_id, 6, 24, 'Veille compétences et métiers', 'Veille sur les compétences, métiers et emplois', 'Sources de veille, analyses sectorielles'),
  (org_id, 6, 25, 'Veille technologique et pédagogique', 'Veille sur innovations pédagogiques et technologiques', 'Outils, méthodes, formations suivies'),
  (org_id, 6, 26, 'Mobilisation des expertises', 'Mobilisation de partenaires et réseaux', 'Conventions de partenariat, intervenants externes'),
  (org_id, 6, 27, 'Conformité réglementaire', 'Conformité aux obligations réglementaires', 'N° DA, Qualiopi, RGPD, affichage'),
  -- Critère 7 : Amélioration continue
  (org_id, 7, 28, 'Recueil des appréciations', 'Recueil des appréciations des parties prenantes', 'Questionnaires satisfaction, enquêtes'),
  (org_id, 7, 29, 'Traitement des réclamations', 'Traitement des difficultés et réclamations', 'Registre réclamations, fiches de traitement'),
  (org_id, 7, 30, 'Mesures d''amélioration', 'Mise en œuvre de mesures d''amélioration', 'Plan d''amélioration, actions correctives'),
  (org_id, 7, 31, 'Analyse des causes', 'Analyse des causes des difficultés rencontrées', 'Analyses, bilans, revues de processus'),
  (org_id, 7, 32, 'Mesures d''amélioration continue', 'Mise en œuvre de mesures d''amélioration continue', 'Bilans, plans d''action, indicateurs de suivi')
  ON CONFLICT (organization_id, critere, indicateur) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Auto-seed on new org (update existing trigger would be better, but for simplicity)
-- Call manually: SELECT seed_qualiopi_indicateurs('org-uuid-here');

-- ============================================================
-- FUNCTION : auto-generate reclamation numero
-- ============================================================

CREATE OR REPLACE FUNCTION generate_reclamation_numero()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    SELECT COUNT(*) + 1 INTO seq_num
    FROM reclamations
    WHERE organization_id = NEW.organization_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.numero := 'REC-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reclamation_numero
  BEFORE INSERT ON reclamations
  FOR EACH ROW EXECUTE FUNCTION generate_reclamation_numero();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE qualiopi_indicateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualiopi_preuves ENABLE ROW LEVEL SECURITY;
ALTER TABLE reclamations ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_amelioration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_qualiopi_ind" ON qualiopi_indicateurs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_qualiopi_preuves" ON qualiopi_preuves
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_reclamations" ON reclamations
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_actions" ON actions_amelioration
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
