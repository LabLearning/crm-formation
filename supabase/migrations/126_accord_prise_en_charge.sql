-- ============================================================
-- 126 — Accord de prise en charge OPCO
--
-- L'accord de prise en charge est la pièce qui autorise la facturation : sans
-- lui, l'OPCO refuse le règlement, et l'auditeur ne peut pas rattacher la
-- session à son financement. Il arrive par mail ou depuis le portail de
-- l'OPCO, jamais produit par le CRM — il se dépose donc comme justificatif.
-- ============================================================

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'accord_prise_en_charge';

-- Date de l'accord : elle borne la période de validité de la prise en charge
-- et sert de repère quand plusieurs accords se succèdent sur un même dossier.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS accord_pec_date date;

COMMENT ON COLUMN sessions.accord_pec_date IS 'Date de l''accord de prise en charge OPCO';
COMMENT ON COLUMN sessions.numero_dossier_opco IS 'Numéro de dossier OPCO, repris sur la facture comme numéro de prise en charge';
