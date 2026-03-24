-- ============================================================
-- MODULE 3 : FORMATIONS — Catalogue, Sessions, Inscriptions, Émargement
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE modalite_formation AS ENUM (
  'presentiel',
  'distanciel',
  'mixte'
);

CREATE TYPE session_status AS ENUM (
  'planifiee',
  'confirmee',
  'en_cours',
  'terminee',
  'annulee'
);

CREATE TYPE inscription_status AS ENUM (
  'pre_inscrit',
  'inscrit',
  'confirme',
  'en_cours',
  'complete',
  'abandonne',
  'annule'
);

-- ============================================================
-- TABLE : formations (catalogue)
-- ============================================================

CREATE TABLE formations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Identification
  reference TEXT, -- Code interne (ex: FOR-2024-001)
  intitule TEXT NOT NULL,
  sous_titre TEXT,
  categorie TEXT,
  -- Programme (Qualiopi C2)
  objectifs_pedagogiques TEXT[], -- Liste des objectifs
  prerequis TEXT,
  public_vise TEXT,
  programme_detaille TEXT, -- Contenu en markdown/texte riche
  competences_visees TEXT[], -- Blocs de compétences
  -- Modalités
  modalite modalite_formation NOT NULL DEFAULT 'presentiel',
  duree_heures DECIMAL(8,2) NOT NULL, -- Durée totale en heures
  duree_jours DECIMAL(5,1), -- Durée en jours
  nombre_sessions_prevu INTEGER DEFAULT 1,
  -- Pédagogie (Qualiopi C4)
  methodes_pedagogiques TEXT, -- ex: Apports théoriques, études de cas, mises en situation
  moyens_techniques TEXT, -- ex: Salle équipée, vidéoprojecteur, supports numériques
  modalites_evaluation TEXT, -- ex: QCM, mise en situation, étude de cas
  -- Accessibilité (Qualiopi C6, Indicateur 26)
  accessibilite_handicap TEXT,
  referent_handicap TEXT,
  -- Tarification
  tarif_inter_ht DECIMAL(12,2), -- Prix par stagiaire (inter-entreprise)
  tarif_intra_ht DECIMAL(12,2), -- Prix pour un groupe (intra-entreprise)
  tarif_individuel_ht DECIMAL(12,2),
  tva_applicable BOOLEAN DEFAULT true,
  taux_tva DECIMAL(4,2) DEFAULT 20.00,
  -- Indicateurs de résultat (Qualiopi C1, Indicateur 2)
  taux_satisfaction DECIMAL(5,2), -- % satisfaction
  taux_reussite DECIMAL(5,2), -- % réussite aux évaluations
  taux_insertion DECIMAL(5,2), -- % insertion professionnelle
  nombre_apprenants_total INTEGER DEFAULT 0,
  -- Versioning (Qualiopi C2, traçabilité)
  version INTEGER DEFAULT 1,
  date_derniere_maj DATE DEFAULT CURRENT_DATE,
  historique_versions JSONB DEFAULT '[]'::jsonb,
  -- Certification
  est_certifiante BOOLEAN DEFAULT false,
  code_rncp TEXT,
  code_rs TEXT,
  certificateur TEXT,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false, -- Visible dans le catalogue public
  -- Meta
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_formations_org ON formations(organization_id);
CREATE INDEX idx_formations_active ON formations(organization_id, is_active);
CREATE INDEX idx_formations_ref ON formations(organization_id, reference);
CREATE INDEX idx_formations_tags ON formations USING GIN(tags);

CREATE TRIGGER tr_formations_updated_at
  BEFORE UPDATE ON formations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : formateurs
-- ============================================================

CREATE TABLE formateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Lien optionnel avec un compte user
  -- Identité
  civilite TEXT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  -- Qualifications (Qualiopi C5, Indicateur 21)
  cv_url TEXT, -- Fichier CV dans Supabase Storage
  qualifications TEXT, -- Diplômes, certifications
  domaines_expertise TEXT[], -- Ex: ['Management', 'Bureautique', 'Sécurité']
  certifications TEXT[], -- Ex: ['PMP', 'ITIL', 'PSM']
  -- Habilitations
  date_derniere_habilitation DATE,
  prochaine_mise_a_jour DATE,
  historique_habilitations JSONB DEFAULT '[]'::jsonb,
  -- Contrat
  type_contrat TEXT DEFAULT 'prestataire', -- 'salarie', 'prestataire', 'benevole'
  siret TEXT, -- Si prestataire
  tarif_journalier DECIMAL(10,2),
  tarif_horaire DECIMAL(10,2),
  -- Évaluation
  note_moyenne DECIMAL(3,2), -- Sur 5
  nombre_evaluations INTEGER DEFAULT 0,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_formateurs_org ON formateurs(organization_id);
CREATE INDEX idx_formateurs_expertise ON formateurs USING GIN(domaines_expertise);

CREATE TRIGGER tr_formateurs_updated_at
  BEFORE UPDATE ON formateurs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : apprenants
-- ============================================================

CREATE TABLE apprenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- Entreprise rattachée
  -- Identité
  civilite TEXT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  date_naissance DATE,
  -- Professionnel
  entreprise TEXT,
  poste TEXT,
  -- Handicap (Qualiopi C6, Indicateur 26)
  situation_handicap BOOLEAN DEFAULT false,
  type_handicap TEXT,
  besoins_adaptation TEXT,
  referent_handicap_contacte BOOLEAN DEFAULT false,
  -- Meta
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_apprenants_org ON apprenants(organization_id);
CREATE INDEX idx_apprenants_client ON apprenants(client_id);
CREATE INDEX idx_apprenants_email ON apprenants(email);

CREATE TRIGGER tr_apprenants_updated_at
  BEFORE UPDATE ON apprenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : sessions
-- ============================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  -- Identification
  reference TEXT, -- Ex: SES-2024-001
  intitule TEXT, -- Peut surcharger le nom de la formation
  -- Planning
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  horaires TEXT, -- Ex: "09:00 - 12:30 / 14:00 - 17:30"
  -- Lieu
  lieu TEXT, -- Nom du lieu ou "Distanciel"
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  lien_visio TEXT, -- Lien Zoom/Teams/Meet
  -- Capacité
  places_min INTEGER DEFAULT 1,
  places_max INTEGER DEFAULT 12,
  -- Formateur
  formateur_id UUID REFERENCES formateurs(id) ON DELETE SET NULL,
  -- Statut
  status session_status NOT NULL DEFAULT 'planifiee',
  -- Financier
  cout_formateur DECIMAL(12,2),
  cout_salle DECIMAL(12,2),
  cout_materiel DECIMAL(12,2),
  -- Notes
  notes_internes TEXT,
  notes_logistiques TEXT,
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_org ON sessions(organization_id);
CREATE INDEX idx_sessions_formation ON sessions(formation_id);
CREATE INDEX idx_sessions_dates ON sessions(date_debut, date_fin);
CREATE INDEX idx_sessions_formateur ON sessions(formateur_id);
CREATE INDEX idx_sessions_status ON sessions(organization_id, status);

CREATE TRIGGER tr_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : inscriptions (apprenant ↔ session)
-- ============================================================

CREATE TABLE inscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  apprenant_id UUID NOT NULL REFERENCES apprenants(id) ON DELETE CASCADE,
  -- Statut
  status inscription_status NOT NULL DEFAULT 'pre_inscrit',
  date_inscription TIMESTAMPTZ DEFAULT NOW(),
  date_confirmation TIMESTAMPTZ,
  date_annulation TIMESTAMPTZ,
  motif_annulation TEXT,
  -- Financement
  financeur_type financeur_type,
  financeur_nom TEXT, -- Nom de l'OPCO ou financeur
  montant_pris_en_charge DECIMAL(12,2),
  numero_prise_en_charge TEXT,
  -- Présence
  heures_presence DECIMAL(8,2) DEFAULT 0,
  taux_assiduite DECIMAL(5,2) DEFAULT 0,
  -- Résultats
  note_evaluation_entree DECIMAL(5,2),
  note_evaluation_sortie DECIMAL(5,2),
  progression DECIMAL(5,2), -- % de progression
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, apprenant_id)
);

CREATE INDEX idx_inscriptions_session ON inscriptions(session_id);
CREATE INDEX idx_inscriptions_apprenant ON inscriptions(apprenant_id);
CREATE INDEX idx_inscriptions_status ON inscriptions(organization_id, status);

CREATE TRIGGER tr_inscriptions_updated_at
  BEFORE UPDATE ON inscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : emargements (feuilles de présence)
-- ============================================================

CREATE TABLE emargements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  apprenant_id UUID NOT NULL REFERENCES apprenants(id) ON DELETE CASCADE,
  -- Créneau
  date DATE NOT NULL,
  creneau TEXT NOT NULL DEFAULT 'matin', -- 'matin', 'apres_midi', 'journee'
  heure_debut TIME,
  heure_fin TIME,
  -- Signature
  est_present BOOLEAN DEFAULT false,
  signature_data TEXT, -- Base64 de la signature ou hash
  signed_at TIMESTAMPTZ,
  ip_address INET,
  -- QR Code / validation
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, apprenant_id, date, creneau)
);

CREATE INDEX idx_emargements_session ON emargements(session_id);
CREATE INDEX idx_emargements_date ON emargements(session_id, date);
CREATE INDEX idx_emargements_apprenant ON emargements(apprenant_id);
CREATE INDEX idx_emargements_token ON emargements(token);

-- ============================================================
-- TABLE : formation_formateurs (many-to-many)
-- ============================================================

CREATE TABLE formation_formateurs (
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  formateur_id UUID NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  est_referent BOOLEAN DEFAULT false,
  PRIMARY KEY (formation_id, formateur_id)
);

-- ============================================================
-- VIEW : sessions avec stats inscriptions
-- ============================================================

CREATE OR REPLACE VIEW sessions_avec_stats AS
SELECT
  s.*,
  f.intitule AS formation_intitule,
  f.duree_heures AS formation_duree_heures,
  f.modalite AS formation_modalite,
  fm.prenom AS formateur_prenom,
  fm.nom AS formateur_nom,
  COUNT(i.id) FILTER (WHERE i.status NOT IN ('annule', 'abandonne')) AS nb_inscrits,
  COUNT(i.id) FILTER (WHERE i.status = 'complete') AS nb_completes,
  s.places_max - COUNT(i.id) FILTER (WHERE i.status NOT IN ('annule', 'abandonne')) AS places_restantes
FROM sessions s
LEFT JOIN formations f ON s.formation_id = f.id
LEFT JOIN formateurs fm ON s.formateur_id = fm.id
LEFT JOIN inscriptions i ON s.id = i.session_id
GROUP BY s.id, f.intitule, f.duree_heures, f.modalite, fm.prenom, fm.nom;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE formateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE apprenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emargements ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_formateurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_formations" ON formations
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_formateurs" ON formateurs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_apprenants" ON apprenants
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_sessions" ON sessions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_inscriptions" ON inscriptions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_emargements" ON emargements
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- formation_formateurs via formation
CREATE POLICY "org_isolation_formation_formateurs" ON formation_formateurs
  FOR ALL USING (formation_id IN (
    SELECT id FROM formations WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));
