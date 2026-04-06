-- ============================================================
-- MIGRATION 014 : POINTAGES FORMATEUR (Pointeuse avec preuve photo)
-- ============================================================

CREATE TABLE pointages_formateur (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  formateur_id UUID NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Date du pointage
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Arrivée
  heure_arrivee TIMESTAMPTZ,
  photo_arrivee_url TEXT,

  -- Départ
  heure_depart TIMESTAMPTZ,
  photo_depart_url TEXT,

  -- Métadonnées
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un seul pointage par formateur par session par jour
  UNIQUE(formateur_id, session_id, date)
);

CREATE INDEX idx_pointages_org ON pointages_formateur(organization_id);
CREATE INDEX idx_pointages_formateur ON pointages_formateur(formateur_id);
CREATE INDEX idx_pointages_session ON pointages_formateur(session_id);
CREATE INDEX idx_pointages_date ON pointages_formateur(date);

ALTER TABLE pointages_formateur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_pointages" ON pointages_formateur
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));
