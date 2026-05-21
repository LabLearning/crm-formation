-- ============================================================
-- 039 — Rapports d'incident (survenus pendant une formation)
-- ============================================================
-- Un incident est rattaché à un établissement (client) et donc à une
-- franchise. Le franchiseur le consulte dans son portail.
-- Types : accident, comportement, materiel, securite, hygiene, organisation, autre
-- Gravité : mineur, modere, majeur, critique
-- Statut : ouvert, en_cours, resolu, clos
-- ============================================================

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  dossier_id UUID REFERENCES dossiers_formation(id) ON DELETE SET NULL,
  -- Contenu
  date_incident DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'autre',      -- accident / comportement / materiel / securite / hygiene / organisation / autre
  gravite TEXT NOT NULL DEFAULT 'mineur',  -- mineur / modere / majeur / critique
  titre TEXT NOT NULL,
  description TEXT,
  mesures_prises TEXT,
  statut TEXT NOT NULL DEFAULT 'ouvert',   -- ouvert / en_cours / resolu / clos
  fichier_url TEXT,
  fichier_filename TEXT,
  auteur_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolu_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id, statut, date_incident DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_franchise ON incidents(franchise_id, date_incident DESC) WHERE franchise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_client ON incidents(client_id);

CREATE TRIGGER tr_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
