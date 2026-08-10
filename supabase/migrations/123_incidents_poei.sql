-- ============================================================
-- 123 — Incidents rattachés à un dossier POEI
--
-- Un incident survenu pendant une POEI (comportement, absence répétée,
-- accident, matériel) doit remonter du formateur au gestionnaire, être
-- rattaché au dossier et, quand il concerne quelqu'un, à la personne.
-- ============================================================

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS poei_id      uuid REFERENCES poei(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS formateur_id uuid REFERENCES formateurs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS apprenant_id uuid REFERENCES apprenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_poei ON incidents(poei_id, date_incident DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_formateur ON incidents(formateur_id);

COMMENT ON COLUMN incidents.formateur_id IS 'Formateur qui a déclaré l''incident (ou qu''il concerne)';
COMMENT ON COLUMN incidents.apprenant_id IS 'Candidat ou stagiaire concerné, le cas échéant';
