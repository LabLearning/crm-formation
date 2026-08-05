-- ============================================================
-- 108 — Grilles d'évaluation POEI (remplies par le formateur)
-- Une grille par candidat et par semaine (suivi au fil de la POEI),
-- + une grille finale (semaine NULL) avec l'avis du formateur.
-- ============================================================

CREATE TABLE IF NOT EXISTS poei_grilles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  poei_id          uuid NOT NULL REFERENCES poei(id) ON DELETE CASCADE,
  apprenant_id     uuid NOT NULL REFERENCES apprenants(id) ON DELETE CASCADE,
  formateur_id     uuid REFERENCES formateurs(id) ON DELETE SET NULL,
  semaine          integer,                       -- 1,2,3… ; NULL = évaluation finale
  date_evaluation  date NOT NULL DEFAULT CURRENT_DATE,
  items            jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {T1:{n:'A',o:'obs'},…}
  appreciations    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {maitrise:'Satisfaisante',…}
  points_forts     text,
  a_renforcer      text,
  recommandations  text,
  avis_final       text,
  motivation_avis  text,
  conclusion       text,
  duree_realisee   text,
  absences         text,
  statut           text NOT NULL DEFAULT 'brouillon',   -- brouillon | validee
  created_by       uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poei_id, apprenant_id, semaine)
);

CREATE INDEX IF NOT EXISTS idx_poei_grilles_org  ON poei_grilles(organization_id);
CREATE INDEX IF NOT EXISTS idx_poei_grilles_poei ON poei_grilles(poei_id);
CREATE INDEX IF NOT EXISTS idx_poei_grilles_appr ON poei_grilles(apprenant_id);

ALTER TABLE poei_grilles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY poei_grilles_org ON poei_grilles
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;
