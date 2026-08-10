-- ============================================================
-- 122 — Facturation OPCO des sessions
--
-- La facture est adressée à l'OPCO, « pour le compte de » l'entreprise. Il
-- faut donc les coordonnées de facturation de l'OPCO, que la table ne portait
-- pas, et le rattachement du financement à la session (numéro de dossier
-- OPCO, montant financé, montant déjà facturé côté Dendreo).
-- ============================================================

-- ── Coordonnées de facturation des OPCO ─────────────────────────────────────
ALTER TABLE opco
  ADD COLUMN IF NOT EXISTS adresse      text,
  ADD COLUMN IF NOT EXISTS code_postal  text,
  ADD COLUMN IF NOT EXISTS ville        text,
  ADD COLUMN IF NOT EXISTS siret        text,
  ADD COLUMN IF NOT EXISTS tva_intra    text,
  ADD COLUMN IF NOT EXISTS delai_paiement_jours integer NOT NULL DEFAULT 60;

-- Reprises de la facture AKTO FA-2026-0171. Les autres OPCO sont à compléter
-- dans le CRM au fur et à mesure.
UPDATE opco SET
  adresse     = COALESCE(adresse, '47 rue de la Victoire'),
  code_postal = COALESCE(code_postal, '75009'),
  ville       = COALESCE(ville, 'PARIS'),
  siret       = COALESCE(siret, '85300098200241'),
  tva_intra   = COALESCE(tva_intra, 'FR77853000982')
WHERE code = 'AKTO';

-- ── Financement OPCO de la session ──────────────────────────────────────────
-- `deja_facture_ailleurs` protège des doublons : les 158 sessions 2026 déjà
-- facturées depuis Dendreo ne doivent pas l'être une seconde fois ici.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS opco_id                uuid REFERENCES opco(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS numero_dossier_opco    text,
  ADD COLUMN IF NOT EXISTS montant_finance_opco   numeric,
  ADD COLUMN IF NOT EXISTS deja_facture_ailleurs  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS financement_synced_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_sessions_opco ON sessions(opco_id);

COMMENT ON COLUMN sessions.deja_facture_ailleurs IS 'Montant déjà facturé hors CRM (Dendreo) — empêche une double facturation';
