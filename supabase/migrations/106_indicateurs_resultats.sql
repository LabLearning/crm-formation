-- ============================================================
-- 106 — Indicateurs de résultats (indicateur Qualiopi 2)
-- Taux publiés (satisfaction, réussite, assiduité, insertion).
-- Obligation de PUBLICATION. Un jeu courant par organisation.
-- ============================================================

CREATE TABLE IF NOT EXISTS indicateurs_resultats (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  periode           text,               -- ex: "2025" ou "12 derniers mois"
  taux_satisfaction numeric,            -- %
  taux_reussite     numeric,            -- %
  taux_assiduite    numeric,            -- %
  taux_insertion    numeric,            -- % (POEI / retour à l'emploi)
  nb_stagiaires     integer,
  nb_sessions       integer,
  commentaire       text,
  publie            boolean NOT NULL DEFAULT false,
  updated_by        uuid REFERENCES users(id),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

ALTER TABLE indicateurs_resultats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY indic_resultats_org ON indicateurs_resultats
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;
