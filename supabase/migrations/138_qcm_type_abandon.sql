-- ============================================================
-- 138 — Type de questionnaire « abandon »
--
-- Le questionnaire d'abandon J+1 (procédure indicateur 12, V1 avril 2024)
-- rejoint la banque QCM : nouveau type dans l'enum. Le seed
-- scripts/seed-questionnaire-abandon.mjs crée ensuite le questionnaire
-- et ses six questions.
-- ============================================================

ALTER TYPE qcm_type ADD VALUE IF NOT EXISTS 'abandon';
