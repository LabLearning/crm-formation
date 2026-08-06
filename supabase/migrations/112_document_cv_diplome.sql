-- ============================================================
-- 112 — Types de document « CV » et « diplôme / habilitation »
-- Pièces attendues au dossier formateur (Qualiopi ind. 21 et 22 :
-- compétences des intervenants et leur actualisation).
-- ============================================================

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'cv';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'diplome';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'habilitation';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'attestation_formation_continue';
