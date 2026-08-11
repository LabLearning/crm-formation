-- ============================================================
-- 124 — Pièces justificatives du dossier de formation
--
-- Les preuves d'une action de formation arrivent le plus souvent en PDF : les
-- formateurs les envoient par mail, ou elles sont éditées depuis l'ancien
-- outil. Le CRM doit pouvoir les recevoir telles quelles, typées, pour que la
-- complétude d'un dossier se lise d'un coup d'œil.
--
-- Les types manquants sont ajoutés à l'énumération existante.
-- ============================================================

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'emargement_signe';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'convention_signee';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'contrat_formateur';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'evaluation_acquis';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'satisfaction';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'positionnement';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'recueil_besoin';

-- Provenance de la pièce : elle explique pourquoi elle n'a pas été produite
-- par le CRM, ce que l'auditeur peut légitimement demander.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS origine text,          -- crm | mail | papier | dendreo
  ADD COLUMN IF NOT EXISTS date_piece date;

CREATE INDEX IF NOT EXISTS idx_documents_session_type ON documents(session_id, type);

COMMENT ON COLUMN documents.origine IS 'D''où vient la pièce : produite par le CRM, reçue par mail, numérisée, ou reprise de l''ancien outil';
