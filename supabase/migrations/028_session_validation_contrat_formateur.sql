-- ============================================================
-- 028 — Confirmation session + contrat formateur signé
-- ============================================================
-- Workflow : après acceptation mission par formateur, le gestionnaire
-- "Confirme la session". À ce moment :
--   1. Status session passe à 'en_attente_signatures'
--   2. Création du contrat de prestation formateur (table contrats_formateur)
--   3. Génération de 2 liens de signature : convention client + contrat formateur
--   4. Envoi de 2 emails (client → convention, formateur → contrat)
-- Quand les 2 signatures sont reçues → session passe à 'validee'.

-- Nouveaux statuts
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'en_attente_signatures' AFTER 'confirmee';
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'validee' AFTER 'en_attente_signatures';

-- Champs sur sessions pour tracer la confirmation
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- ============================================================
-- TABLE contrats_formateur (cycle similaire aux conventions)
-- ============================================================

CREATE TYPE contrat_formateur_status AS ENUM (
  'brouillon',
  'envoye',
  'signe_formateur',
  'signe_complete',
  'annule'
);

CREATE TABLE IF NOT EXISTS contrats_formateur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  formateur_id UUID NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  numero TEXT,                             -- CT-YYYY-NNN
  status contrat_formateur_status DEFAULT 'brouillon',
  -- Détails financiers
  tarif_journalier NUMERIC(10,2),
  nombre_jours NUMERIC(4,1),
  montant_ht NUMERIC(12,2),
  -- Signature formateur (lien public)
  signature_token TEXT UNIQUE,
  signature_token_expires_at TIMESTAMPTZ,
  signature_formateur_date TIMESTAMPTZ,
  signature_formateur_nom TEXT,
  signature_formateur_signature_data TEXT,
  signature_formateur_ip TEXT,
  signature_formateur_user_agent TEXT,
  -- Signature OF (Lab Learning) — automatique au moment de l'envoi
  signature_of_date TIMESTAMPTZ,
  signature_of_nom TEXT,
  -- Dates clés
  sent_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contrats_formateur_session ON contrats_formateur(session_id);
CREATE INDEX IF NOT EXISTS idx_contrats_formateur_formateur ON contrats_formateur(formateur_id);
CREATE INDEX IF NOT EXISTS idx_contrats_formateur_token ON contrats_formateur(signature_token) WHERE signature_token IS NOT NULL;

CREATE TRIGGER tr_contrats_formateur_updated_at
  BEFORE UPDATE ON contrats_formateur
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE contrats_formateur IS 'Contrats de prestation envoyés au formateur, signés via lien public';
