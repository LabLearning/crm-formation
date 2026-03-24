-- ============================================================
-- MODULE 7 : QCM & ÉVALUATIONS (Qualiopi C5/C7)
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE qcm_type AS ENUM (
  'positionnement',    -- Qualiopi C2 Ind.17
  'entree',            -- Évaluation diagnostique
  'sortie',            -- Qualiopi C5 Ind.18
  'satisfaction_chaud', -- Qualiopi C7 Ind.30
  'satisfaction_froid'  -- Qualiopi C7 Ind.31
);

CREATE TYPE question_type AS ENUM (
  'choix_unique',
  'choix_multiple',
  'vrai_faux',
  'note_1_5',
  'note_1_10',
  'texte_libre',
  'nps'
);

CREATE TYPE evaluation_status AS ENUM (
  'brouillon',
  'publie',
  'en_cours',
  'termine',
  'archive'
);

-- ============================================================
-- TABLE : qcm (banque de questionnaires)
-- ============================================================

CREATE TABLE qcm (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  -- Identification
  titre TEXT NOT NULL,
  description TEXT,
  type qcm_type NOT NULL,
  -- Configuration
  duree_minutes INTEGER, -- Temps limite
  score_min_reussite DECIMAL(5,2), -- % min pour réussir (QCM)
  questions_aleatoires BOOLEAN DEFAULT false,
  afficher_resultats BOOLEAN DEFAULT true, -- Montrer les résultats au participant
  -- Statut
  status evaluation_status NOT NULL DEFAULT 'brouillon',
  is_template BOOLEAN DEFAULT false, -- Modèle réutilisable
  -- Meta
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_org ON qcm(organization_id);
CREATE INDEX idx_qcm_formation ON qcm(formation_id);
CREATE INDEX idx_qcm_type ON qcm(organization_id, type);

CREATE TRIGGER tr_qcm_updated_at
  BEFORE UPDATE ON qcm FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : qcm_questions
-- ============================================================

CREATE TABLE qcm_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qcm_id UUID NOT NULL REFERENCES qcm(id) ON DELETE CASCADE,
  -- Question
  texte TEXT NOT NULL,
  type question_type NOT NULL DEFAULT 'choix_unique',
  explication TEXT, -- Explication affichée après réponse
  points DECIMAL(5,2) DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  -- Ordre
  position INTEGER DEFAULT 0,
  -- Section / regroupement
  section TEXT, -- Ex: "Connaissances générales", "Satisfaction globale"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_questions ON qcm_questions(qcm_id, position);

-- ============================================================
-- TABLE : qcm_choix (options de réponse)
-- ============================================================

CREATE TABLE qcm_choix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES qcm_questions(id) ON DELETE CASCADE,
  texte TEXT NOT NULL,
  est_correct BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_choix ON qcm_choix(question_id, position);

-- ============================================================
-- TABLE : qcm_sessions (instance d'un QCM pour une session)
-- ============================================================

CREATE TABLE qcm_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  qcm_id UUID NOT NULL REFERENCES qcm(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Période
  date_ouverture TIMESTAMPTZ DEFAULT NOW(),
  date_fermeture TIMESTAMPTZ,
  -- Envoi
  envoi_auto BOOLEAN DEFAULT false,
  envoye_at TIMESTAMPTZ,
  -- Rappels (satisfaction)
  rappel_j30 BOOLEAN DEFAULT false,
  rappel_j90 BOOLEAN DEFAULT false,
  date_rappel_j30 TIMESTAMPTZ,
  date_rappel_j90 TIMESTAMPTZ,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_sessions ON qcm_sessions(qcm_id, session_id);

-- ============================================================
-- TABLE : qcm_reponses (résultats d'un apprenant)
-- ============================================================

CREATE TABLE qcm_reponses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  qcm_id UUID NOT NULL REFERENCES qcm(id) ON DELETE CASCADE,
  qcm_session_id UUID REFERENCES qcm_sessions(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  apprenant_id UUID NOT NULL REFERENCES apprenants(id) ON DELETE CASCADE,
  -- Accès
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  -- Résultat
  score DECIMAL(5,2), -- Score obtenu en %
  score_points DECIMAL(8,2), -- Points obtenus
  score_total DECIMAL(8,2), -- Points max possibles
  is_reussi BOOLEAN,
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duree_secondes INTEGER,
  -- Statut
  is_complete BOOLEAN DEFAULT false,
  -- Meta
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_reponses_qcm ON qcm_reponses(qcm_id);
CREATE INDEX idx_qcm_reponses_apprenant ON qcm_reponses(apprenant_id);
CREATE INDEX idx_qcm_reponses_session ON qcm_reponses(session_id);
CREATE INDEX idx_qcm_reponses_token ON qcm_reponses(token);

-- ============================================================
-- TABLE : qcm_reponses_detail (réponses question par question)
-- ============================================================

CREATE TABLE qcm_reponses_detail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reponse_id UUID NOT NULL REFERENCES qcm_reponses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES qcm_questions(id) ON DELETE CASCADE,
  -- Réponse
  choix_ids UUID[], -- IDs des choix sélectionnés
  texte_libre TEXT, -- Pour les questions ouvertes
  note_valeur INTEGER, -- Pour les échelles (1-5, 1-10, NPS)
  -- Évaluation
  est_correct BOOLEAN,
  points_obtenus DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reponses_detail ON qcm_reponses_detail(reponse_id);

-- ============================================================
-- TABLE : evaluations_satisfaction (résultats agrégés)
-- ============================================================

CREATE TABLE evaluations_satisfaction (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  type qcm_type NOT NULL, -- satisfaction_chaud ou satisfaction_froid
  -- Stats agrégées
  nombre_reponses INTEGER DEFAULT 0,
  nombre_invites INTEGER DEFAULT 0,
  taux_reponse DECIMAL(5,2) DEFAULT 0,
  note_moyenne DECIMAL(3,2) DEFAULT 0, -- /5
  nps_score INTEGER, -- -100 à +100
  -- Détail par thème
  note_contenu DECIMAL(3,2),
  note_formateur DECIMAL(3,2),
  note_organisation DECIMAL(3,2),
  note_supports DECIMAL(3,2),
  note_applicabilite DECIMAL(3,2),
  -- Verbatims
  points_forts TEXT[], -- Agrégation des commentaires positifs
  axes_amelioration TEXT[], -- Agrégation des suggestions
  -- Meta
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eval_satisfaction_session ON evaluations_satisfaction(session_id);
CREATE INDEX idx_eval_satisfaction_type ON evaluations_satisfaction(organization_id, type);

CREATE TRIGGER tr_eval_satisfaction_updated_at
  BEFORE UPDATE ON evaluations_satisfaction FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE qcm ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_choix ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_reponses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_reponses_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations_satisfaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_qcm" ON qcm
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_qcm_questions" ON qcm_questions
  FOR ALL USING (qcm_id IN (SELECT id FROM qcm WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_qcm_choix" ON qcm_choix
  FOR ALL USING (question_id IN (SELECT id FROM qcm_questions WHERE qcm_id IN (SELECT id FROM qcm WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))));

CREATE POLICY "org_isolation_qcm_sessions" ON qcm_sessions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_qcm_reponses" ON qcm_reponses
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_qcm_reponses_detail" ON qcm_reponses_detail
  FOR ALL USING (reponse_id IN (SELECT id FROM qcm_reponses WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_eval_satisfaction" ON evaluations_satisfaction
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Public access for token-based QCM responses
CREATE POLICY "public_qcm_by_token" ON qcm_reponses
  FOR SELECT USING (true);
