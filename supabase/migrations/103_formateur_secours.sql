-- ============================================================
-- 103 — Vivier de formateurs de secours
-- Flag opt-in : formateur mobilisable en remplacement de dernière
-- minute. Sert le plan de continuité (Qualiopi ind. 18) face aux
-- désistements formateurs.
-- ============================================================

ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS formateur_secours boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_formateurs_secours ON formateurs(organization_id, formateur_secours) WHERE formateur_secours = true;
