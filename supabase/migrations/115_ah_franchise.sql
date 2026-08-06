-- ============================================================
-- 115 — Rattachement des établissements audités à une franchise
-- Une grande partie des établissements audités appartiennent à un réseau connu
-- (Chamas Tacos, Chicken Street, Chickeez…) sans être clients en propre : ce
-- sont des prospects qualifiés, pas des inconnus.
-- ============================================================

ALTER TABLE ah_etablissements
  ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES franchises(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ah_etab_franchise ON ah_etablissements(franchise_id);
