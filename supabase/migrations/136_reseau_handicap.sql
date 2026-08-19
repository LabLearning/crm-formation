-- ============================================================
-- 136 — Réseau handicap (indicateur 26)
--
-- Liste actualisée des contacts du réseau handicap, par région :
-- Ressource Handicap Formation (Agefiph), Cap emploi, MDPH…
-- Le référent handicap la tient à jour ; chaque ligne porte sa date
-- de dernière vérification.
-- ============================================================

CREATE TABLE IF NOT EXISTS reseau_handicap (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  region           text NOT NULL,
  organisme        text NOT NULL,           -- RHF Agefiph, Cap emploi, MDPH…
  nom              text,
  prenom           text,
  telephone        text,
  email            text,
  notes            text,
  verifie_le       date,                    -- dernière actualisation du contact
  created_by       uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reseau_handicap_org ON reseau_handicap(organization_id, region);

ALTER TABLE reseau_handicap ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY reseau_handicap_org ON reseau_handicap
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE reseau_handicap IS
  'Contacts du réseau handicap par région (RHF/Agefiph, Cap emploi, MDPH) — indicateur 26, tenus à jour par le référent handicap.';
