-- ============================================================
-- 137 — Entretien du candidat POEI
--
-- Compte rendu de l'entretien de recrutement/positionnement mené avec
-- chaque candidat avant l'entrée en POEI (texte libre, tracé sur la
-- fiche candidat du projet). Sert aussi de preuve d'individualisation
-- du parcours (indicateurs 4 et 10).
-- ============================================================

ALTER TABLE poei_candidats
  ADD COLUMN IF NOT EXISTS entretien text,
  ADD COLUMN IF NOT EXISTS entretien_date date;

COMMENT ON COLUMN poei_candidats.entretien IS
  'Compte rendu de l''entretien du candidat (recrutement / positionnement), texte libre.';
