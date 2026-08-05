-- ============================================================
-- 104 — Évaluations des acquis (import Dendreo)
-- Réceptacle pour les vraies évaluations notées par les formateurs
-- (importées de Dendreo). Preuve de l'indicateur Qualiopi 11.
-- ============================================================

CREATE TABLE IF NOT EXISTS evaluations_acquis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  apprenant_id      uuid REFERENCES apprenants(id) ON DELETE SET NULL,
  session_id        uuid REFERENCES sessions(id) ON DELETE SET NULL,
  formation_id      uuid REFERENCES formations(id) ON DELETE SET NULL,
  formateur_id      uuid REFERENCES formateurs(id) ON DELETE SET NULL,
  note              numeric,
  note_max          numeric,
  appreciation      text,
  validee           boolean NOT NULL DEFAULT false,
  date_evaluation   date,
  source            text NOT NULL DEFAULT 'dendreo',
  dendreo_key       text,          -- id_lmp:eval_set:evaluator:created_at (idempotence)
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, dendreo_key)
);

CREATE INDEX IF NOT EXISTS idx_eval_acquis_org      ON evaluations_acquis(organization_id);
CREATE INDEX IF NOT EXISTS idx_eval_acquis_session  ON evaluations_acquis(organization_id, session_id);
CREATE INDEX IF NOT EXISTS idx_eval_acquis_apprenant ON evaluations_acquis(organization_id, apprenant_id);

ALTER TABLE evaluations_acquis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY eval_acquis_org_isolation ON evaluations_acquis
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;
