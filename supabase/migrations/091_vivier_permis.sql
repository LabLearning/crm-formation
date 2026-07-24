-- 091 — Permis de conduire du candidat (critère de sourcing fréquent)
ALTER TABLE candidats_vivier ADD COLUMN IF NOT EXISTS permis boolean DEFAULT false;
