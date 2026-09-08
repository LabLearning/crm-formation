-- ============================================================
-- 147 — Commissions franchise calculées PAR SESSION
--
-- Le financier franchise était assis sur dossiers_formation, que le flux
-- réel (imports Dendreo, POEI, sessions directes) ne crée plus : toutes les
-- franchises affichaient 0 établissement formé, 0 CA, 0 commission.
-- La session est l'unité réelle : une ligne de commission par session d'un
-- établissement rattaché à une franchise, même règle de calcul (10 % du
-- budget débloqué ou 40 % du budget net après coût formateur).
-- ============================================================

CREATE TABLE IF NOT EXISTS commissions_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  franchise_id uuid NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  session_id uuid NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  -- Base de calcul : prise en charge OPCO de la session, à défaut son prix HT
  base_montant numeric(12,2) NOT NULL DEFAULT 0,
  base_source text NOT NULL DEFAULT 'aucune',            -- 'opco' | 'prix_ht' | 'aucune'
  cout_formateur numeric(12,2) NOT NULL DEFAULT 0,       -- contrats formateur, sinon saisie manuelle × jours, sinon champ session
  cout_formateur_manuel numeric(12,2),                   -- tarif journalier saisi à la main
  commission_type text NOT NULL DEFAULT 'budget_debloque',
  commission_taux numeric(6,2) NOT NULL DEFAULT 10,
  commission_montant numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'a_venir',                -- a_venir | validee | payee | annulee
  validee_at timestamptz,
  payee_at timestamptz,
  calculee_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commissions_sessions_franchise ON commissions_sessions (franchise_id, status);
CREATE INDEX IF NOT EXISTS commissions_sessions_org ON commissions_sessions (organization_id);

ALTER TABLE commissions_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE commissions_sessions IS
  'Commission franchise par session (remplace le calcul par dossier). Statut figé une fois validée ou payée.';
