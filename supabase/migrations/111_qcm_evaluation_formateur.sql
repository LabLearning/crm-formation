-- ============================================================
-- 111 — Questionnaire d'évaluation du formateur
-- Un questionnaire unique, commun à toutes les formations
-- (formation_id = NULL), rempli par les apprenants en fin de session.
-- ============================================================

ALTER TYPE qcm_type ADD VALUE IF NOT EXISTS 'evaluation_formateur';
