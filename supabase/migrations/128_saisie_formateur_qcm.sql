-- ============================================================
-- 128 — Pas de traçabilité de saisie sur les questionnaires
--
-- Une version antérieure de cette migration ajoutait `saisi_par` et
-- `saisi_le` sur qcm_reponses, pour distinguer une réponse reportée par un
-- tiers d'une réponse remplie par le stagiaire. Choix de l'organisme : ne pas
-- conserver cette distinction.
--
-- Les colonnes sont donc retirées si elles avaient été créées. Les
-- horodatages existants — completed_at, created_at — restent inchangés : ils
-- n'ont jamais dépendu de cette migration.
-- ============================================================

ALTER TABLE qcm_reponses
  DROP COLUMN IF EXISTS saisi_par,
  DROP COLUMN IF EXISTS saisi_le;

DROP INDEX IF EXISTS idx_qcm_reponses_saisie;
