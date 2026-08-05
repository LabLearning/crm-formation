-- ============================================================
-- 102 — Statut de veille (agent IA : brouillon → validée)
-- L'agent de veille propose des brouillons ; seules les entrées
-- VALIDÉES par un humain comptent pour les indicateurs Qualiopi.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE veille_statut AS ENUM ('brouillon', 'validee');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE veilles ADD COLUMN IF NOT EXISTS statut veille_statut NOT NULL DEFAULT 'validee';
ALTER TABLE veilles ADD COLUMN IF NOT EXISTS genere_par_ia boolean NOT NULL DEFAULT false;
ALTER TABLE veilles ADD COLUMN IF NOT EXISTS validee_par uuid REFERENCES users(id);
ALTER TABLE veilles ADD COLUMN IF NOT EXISTS validee_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_veilles_statut ON veilles(organization_id, statut);
