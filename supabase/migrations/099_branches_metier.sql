-- ============================================================
-- 099 — Branches métier (secteur d'activité)
-- ============================================================
-- L'activité de Lab Learning s'organise par branche : restauration rapide,
-- restaurant/HCR, boucherie-charcuterie, boulangerie-pâtisserie.
--
--  • formations.branches       : branches ciblées (slugs)
--  • formations.est_transverse : proposée à toutes les branches (hygiène,
--                                sécurité, management…)
--  • formations.site_publie    : visible sur le site vitrine (les one-offs
--                                internes / hors métiers de bouche = false)
--  • clients.branche / leads.branche : secteur métier de l'établissement
--
-- Slugs de branche : 'restauration-rapide', 'restaurant-hcr',
--                    'boucherie-charcuterie', 'boulangerie-patisserie'
--
-- Les valeurs initiales sont posées par le script migration/seed-branches.mjs.
-- ============================================================

ALTER TABLE formations ADD COLUMN IF NOT EXISTS branches TEXT[] DEFAULT '{}';
ALTER TABLE formations ADD COLUMN IF NOT EXISTS est_transverse BOOLEAN DEFAULT FALSE;
ALTER TABLE formations ADD COLUMN IF NOT EXISTS site_publie BOOLEAN DEFAULT TRUE;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS branche TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS branche TEXT;

CREATE INDEX IF NOT EXISTS idx_formations_branches ON formations USING GIN (branches);
CREATE INDEX IF NOT EXISTS idx_formations_site_publie ON formations (organization_id, site_publie);
CREATE INDEX IF NOT EXISTS idx_clients_branche ON clients (organization_id, branche);
CREATE INDEX IF NOT EXISTS idx_leads_branche ON leads (organization_id, branche);
