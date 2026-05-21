-- ============================================================
-- 036 — Franchises : rattachement établissements + commission par dossier
-- ============================================================
-- Une franchise = apporteurs_affaires avec categorie='partenaire'.
-- Hiérarchie : Franchise → Établissements (clients) → Dossiers.
--
-- Commission : 2 modes configurables par franchise
--   - 'budget_debloque' : taux% × montant_prise_en_charge (ex: 10%)
--   - 'budget_net'      : taux% × (prise_en_charge - cout_formateur) (ex: 40%)
--
-- Le rôle user 'franchise' est ajouté séparément (ALTER TYPE hors transaction).
-- ============================================================

-- 1. Lien établissement → franchise
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES apporteurs_affaires(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_franchise ON clients(franchise_id) WHERE franchise_id IS NOT NULL;

-- 2. Mode de commission au niveau franchise
ALTER TABLE apporteurs_affaires
  ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'budget_debloque';
  -- 'budget_debloque' (taux × prise_en_charge) | 'budget_net' (taux × (prise_en_charge - cout_formateur))

-- 3. Champs commission + financier sur le dossier (snapshot au calcul)
ALTER TABLE dossiers_formation
  ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES apporteurs_affaires(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cout_formateur NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS commission_taux NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_type TEXT,
  ADD COLUMN IF NOT EXISTS commission_montant NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'a_venir',
  -- 'a_venir' | 'validee' | 'payee' | 'annulee'
  ADD COLUMN IF NOT EXISTS commission_calculee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_payee_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dossiers_franchise ON dossiers_formation(franchise_id, commission_status)
  WHERE franchise_id IS NOT NULL;

-- 4. Table audits établissement (notes/bilans des audits chez le client)
CREATE TABLE IF NOT EXISTS audits_etablissement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES apporteurs_affaires(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  date_audit DATE NOT NULL DEFAULT CURRENT_DATE,
  type_audit TEXT DEFAULT 'conformite',   -- conformite / hygiene / qualite / autre
  note_globale NUMERIC(4,1),               -- ex: note /20 ou /100
  note_sur INTEGER DEFAULT 20,             -- barème (20 ou 100)
  points_forts TEXT,
  points_amelioration TEXT,
  bilan TEXT,
  commentaires TEXT,
  fichier_url TEXT,
  fichier_filename TEXT,
  auteur_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audits_client ON audits_etablissement(client_id, date_audit DESC);
CREATE INDEX IF NOT EXISTS idx_audits_franchise ON audits_etablissement(franchise_id, date_audit DESC);

CREATE TRIGGER tr_audits_updated_at
  BEFORE UPDATE ON audits_etablissement
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Lien user → franchise (pour comptes franchise en phase 2)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES apporteurs_affaires(id) ON DELETE SET NULL;

-- ============================================================
-- 6. Backfill : rattacher les établissements existants à leur franchise
--    via leads.apporteur_id → converted_client_id (apporteur partenaire)
-- ============================================================
UPDATE clients c
SET franchise_id = l.apporteur_id
FROM leads l
JOIN apporteurs_affaires a ON a.id = l.apporteur_id
WHERE l.converted_client_id = c.id
  AND l.apporteur_id IS NOT NULL
  AND a.categorie = 'partenaire'
  AND c.franchise_id IS NULL;
