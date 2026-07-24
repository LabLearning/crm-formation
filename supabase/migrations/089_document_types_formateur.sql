-- 089 — Types de documents que le formateur dépose lui-même (pièces administratives)
-- URSSAF et Kbis existent déjà (072). On ajoute NDA, responsabilité civile et
-- attestation de régularité fiscale.

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'nda';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'responsabilite_civile';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'attestation_fiscale';
