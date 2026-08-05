-- ============================================================
-- 101 — Veille Qualiopi (indicateurs 23 / 24 / 25 / 26)
-- Registre de veille : légale/réglementaire, métier/emploi,
-- pédagogique/technologique, handicap. Trace exigée par le RNQ v9.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE veille_type AS ENUM ('legale', 'metier', 'pedagogique', 'handicap');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS veilles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type             veille_type NOT NULL,
  titre            text NOT NULL,
  source           text,                    -- Legifrance, OPCO, presse pro, webinaire…
  date_veille      date NOT NULL DEFAULT CURRENT_DATE,
  resume           text,                    -- ce qui a été observé
  impact           text,                    -- impact sur nos prestations
  action           text,                    -- action déclenchée (adaptation programme…)
  lien             text,                    -- URL source
  created_by       uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_veilles_org      ON veilles(organization_id);
CREATE INDEX IF NOT EXISTS idx_veilles_type     ON veilles(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_veilles_date     ON veilles(organization_id, date_veille DESC);

ALTER TABLE veilles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY veilles_org_isolation ON veilles
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;
