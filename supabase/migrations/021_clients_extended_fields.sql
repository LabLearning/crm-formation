-- ============================================================
-- 021 — Champs entreprise enrichis pour la fiche client
-- ============================================================
-- Ajout de champs récupérés automatiquement depuis l'API data.gouv
-- pour avoir une fiche client la plus complète possible.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS sigle TEXT,
  ADD COLUMN IF NOT EXISTS forme_juridique TEXT,
  ADD COLUMN IF NOT EXISTS date_creation_entreprise DATE,
  ADD COLUMN IF NOT EXISTS effectif_libelle TEXT,
  ADD COLUMN IF NOT EXISTS tva_intra TEXT,
  ADD COLUMN IF NOT EXISTS est_qualiopi BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS est_organisme_formation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN clients.sigle IS 'Sigle de la société (ex: SNCF)';
COMMENT ON COLUMN clients.forme_juridique IS 'Forme juridique courte (SAS, SARL, SCI, etc.)';
COMMENT ON COLUMN clients.date_creation_entreprise IS 'Date de création officielle (Sirene)';
COMMENT ON COLUMN clients.effectif_libelle IS 'Libellé de la tranche d''effectif (ex: "10 à 19 salariés")';
COMMENT ON COLUMN clients.tva_intra IS 'Numéro de TVA intracommunautaire (calculé depuis le SIREN)';
COMMENT ON COLUMN clients.est_qualiopi IS 'Entreprise certifiée Qualiopi (depuis data.gouv)';
COMMENT ON COLUMN clients.est_organisme_formation IS 'Entreprise référencée comme organisme de formation';
