-- ============================================================
-- 107 — Analyse du besoin au niveau FORMATION (Qualiopi ind. 4)
-- Chaque formation répond à un besoin identifié, validé une fois
-- par formation (base commune ; le recueil par session capture le
-- besoin spécifique du client).
-- ============================================================

ALTER TABLE formations ADD COLUMN IF NOT EXISTS analyse_besoin text;
ALTER TABLE formations ADD COLUMN IF NOT EXISTS besoin_valide boolean NOT NULL DEFAULT false;
ALTER TABLE formations ADD COLUMN IF NOT EXISTS besoin_valide_par uuid REFERENCES users(id);
ALTER TABLE formations ADD COLUMN IF NOT EXISTS besoin_valide_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_formations_besoin_valide ON formations(organization_id, besoin_valide);
