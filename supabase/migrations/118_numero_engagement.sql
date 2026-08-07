-- ============================================================
-- 118 — Numéro d'engagement France Travail
-- Référence attribuée par France Travail à l'engagement financier du dossier.
-- Elle doit figurer sur la facture (« Numéro dossier » sur les factures
-- Dendreo) et être saisie à la facturation comme à la clôture du dossier.
-- ============================================================

ALTER TABLE poei
  ADD COLUMN IF NOT EXISTS numero_engagement text;

-- Porté aussi par la facture : elle reste juste même si le dossier évolue.
ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS numero_engagement text;

COMMENT ON COLUMN poei.numero_engagement IS 'N° d''engagement France Travail du dossier POEI';
COMMENT ON COLUMN factures.numero_engagement IS 'N° d''engagement du financeur, figé sur la facture';

-- ── Affacturage ─────────────────────────────────────────────────────────────
-- Les factures sont cédées à un factor : le règlement doit être adressé à SON
-- compte, pas à celui de l'organisme. Imprimer l'IBAN de l'organisme sur une
-- facture cédée expose à un paiement sur le mauvais compte.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS affacturage_actif   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS affacturage_societe text,
  ADD COLUMN IF NOT EXISTS affacturage_iban    text,
  ADD COLUMN IF NOT EXISTS affacturage_bic     text,
  ADD COLUMN IF NOT EXISTS affacturage_compte  text,
  ADD COLUMN IF NOT EXISTS affacturage_mention text;

-- Valeurs de depart reprises des factures Dendreo ; elles restent modifiables
-- dans Parametres > Affacturage.
UPDATE organizations SET
  affacturage_actif   = true,
  affacturage_societe = COALESCE(affacturage_societe, 'Bibby Factor'),
  affacturage_compte  = COALESCE(affacturage_compte, 'LCL N° 30002 01958 0000062140E 87'),
  affacturage_iban    = COALESCE(affacturage_iban, 'FR77 3000 2019 5800 0006 2140 E87'),
  affacturage_bic     = COALESCE(affacturage_bic, 'CRLYFRPP')
WHERE id = 'ff747dfe-c034-44d8-98d7-e53892263fb5';
