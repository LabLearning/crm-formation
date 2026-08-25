-- Abandon d'un candidat POEI : date, heures réellement effectuées (base de
-- la facturation au prorata France Travail) et motif.
ALTER TABLE poei_candidats
  ADD COLUMN IF NOT EXISTS date_abandon date,
  ADD COLUMN IF NOT EXISTS heures_effectuees numeric,
  ADD COLUMN IF NOT EXISTS motif_abandon text;
