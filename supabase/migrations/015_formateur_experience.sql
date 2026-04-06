-- ============================================================
-- MIGRATION 015 : EXPÉRIENCE FORMATEUR COMPLÈTE
-- Profil enrichi, disponibilités, rapports de session,
-- documents formateur, facturation formateur
-- ============================================================

-- ── A. Enrichir la table formateurs (profil) ──────────────
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS diplomes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS ville TEXT;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS code_postal TEXT;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS siret TEXT;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS type_contrat TEXT DEFAULT 'prestataire';
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS tarif_journalier DECIMAL(10,2);
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS tarif_horaire DECIMAL(10,2);

-- ── B. Disponibilités formateur ───────────────────────────
CREATE TABLE IF NOT EXISTS formateur_disponibilites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  formateur_id UUID NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'disponible',
  creneau TEXT DEFAULT 'journee',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(formateur_id, date, creneau)
);
CREATE INDEX IF NOT EXISTS idx_dispo_org ON formateur_disponibilites(organization_id);
CREATE INDEX IF NOT EXISTS idx_dispo_formateur ON formateur_disponibilites(formateur_id, date);

-- ── C. Rapports de session ────────────────────────────────
CREATE TABLE IF NOT EXISTS rapports_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  formateur_id UUID NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  contenu_aborde TEXT,
  objectifs_atteints TEXT,
  objectifs_non_atteints TEXT,
  difficultes_rencontrees TEXT,
  recommandations TEXT,
  points_positifs TEXT,
  commentaires_generaux TEXT,
  commentaires_apprenants JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'brouillon',
  submitted_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, formateur_id)
);
CREATE INDEX IF NOT EXISTS idx_rapports_org ON rapports_session(organization_id);
CREATE INDEX IF NOT EXISTS idx_rapports_session ON rapports_session(session_id);
CREATE INDEX IF NOT EXISTS idx_rapports_formateur ON rapports_session(formateur_id);

-- ── D. Documents formateur (étendre la table documents) ───
ALTER TABLE documents ADD COLUMN IF NOT EXISTS formateur_id UUID REFERENCES formateurs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_formateur ON documents(formateur_id);

-- ── E. Factures formateur ─────────────────────────────────
CREATE TABLE IF NOT EXISTS factures_formateur (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  formateur_id UUID NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  numero TEXT,
  reference_externe TEXT,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  montant_ht DECIMAL(12,2) NOT NULL,
  taux_tva DECIMAL(4,2) DEFAULT 20.00,
  montant_tva DECIMAL(12,2) DEFAULT 0,
  montant_ttc DECIMAL(12,2) NOT NULL,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE,
  status TEXT NOT NULL DEFAULT 'brouillon',
  fichier_url TEXT,
  fichier_nom TEXT,
  periode_debut DATE,
  periode_fin DATE,
  date_paiement DATE,
  reference_paiement TEXT,
  objet TEXT,
  notes TEXT,
  motif_rejet TEXT,
  submitted_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fact_form_org ON factures_formateur(organization_id);
CREATE INDEX IF NOT EXISTS idx_fact_form_formateur ON factures_formateur(formateur_id);
CREATE INDEX IF NOT EXISTS idx_fact_form_status ON factures_formateur(organization_id, status);
