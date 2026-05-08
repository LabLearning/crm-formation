-- ============================================================
-- 029 — Workflow OPCO sur dossiers_formation
-- ============================================================
-- Quand une session passe à 'validee' (convention + contrat signés),
-- on crée automatiquement un dossier_formation avec un workflow OPCO
-- dédié (distinct du status général du dossier).
--
-- Cycle OPCO :
--   a_constituer → pret_a_envoyer → envoye_opco → en_attente_opco
--   → valide_opco → mise_en_paiement → paye
--   (ou refuse_opco à toute étape)

CREATE TYPE opco_workflow_status AS ENUM (
  'a_constituer',     -- Pièces manquantes (convention pas signée, etc.)
  'pret_a_envoyer',   -- Pièces complètes, prêt à envoyer à l'OPCO
  'envoye_opco',      -- Demande envoyée à l'OPCO
  'en_attente_opco',  -- En attente de réponse OPCO
  'valide_opco',      -- OPCO a validé la prise en charge
  'refuse_opco',      -- OPCO a refusé
  'mise_en_paiement', -- Formation terminée + tout validé → on facture
  'paye'              -- Paiement reçu
);

ALTER TABLE dossiers_formation
  ADD COLUMN IF NOT EXISTS opco_workflow_status opco_workflow_status DEFAULT 'a_constituer',
  ADD COLUMN IF NOT EXISTS opco_id UUID REFERENCES opco(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opco_envoye_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opco_valide_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opco_refuse_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opco_motif_refus TEXT,
  ADD COLUMN IF NOT EXISTS opco_numero_dossier TEXT,
  ADD COLUMN IF NOT EXISTS mise_en_paiement_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paye_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dossiers_opco_status ON dossiers_formation(organization_id, opco_workflow_status);
CREATE INDEX IF NOT EXISTS idx_dossiers_opco ON dossiers_formation(opco_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_session ON dossiers_formation(session_id) WHERE session_id IS NOT NULL;

COMMENT ON COLUMN dossiers_formation.opco_workflow_status IS
'Cycle workflow OPCO : a_constituer / pret_a_envoyer / envoye / en_attente / valide / refuse / mise_en_paiement / paye';
COMMENT ON COLUMN dossiers_formation.opco_numero_dossier IS
'Numéro de dossier retourné par l''OPCO après validation';
