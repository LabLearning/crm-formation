-- 090 — Rattacher un candidat du vivier à un POEI "à planifier" (prévision),
-- pas seulement à un projet POEI déjà créé.

ALTER TABLE candidats_vivier
  ADD COLUMN IF NOT EXISTS poei_prevision_id uuid REFERENCES poei_previsions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidats_vivier_prevision ON candidats_vivier(poei_prevision_id);
