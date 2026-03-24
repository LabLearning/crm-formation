-- ══════════════════════════════════════════════════════════════
-- SEED: Partenaires franchise + token portail
-- Execute APRES la migration 011_partenaires.sql
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  org_id UUID := 'ff747dfe-c034-44d8-98d7-e53892263fb5';
  admin_id UUID := '16a538a0-ca4e-42f1-b2a0-354aea73ca46';
  p1 UUID := uuid_generate_v4();
  p2 UUID := uuid_generate_v4();
BEGIN

-- Partenaire 1: Franchise Quick regional
INSERT INTO apporteurs_affaires (id, organization_id, type, categorie, nom, prenom, email, telephone, raison_sociale, siret, nom_enseigne, nombre_points_vente, secteur, zone_geographique, taux_commission, mode_calcul, objectif_annuel_ca, objectif_annuel_dossiers, date_debut_contrat, ville, is_active, conditions)
VALUES (p1, org_id, 'entreprise', 'partenaire', 'Delattre', 'Michel', 'michel.delattre@quick-sud.fr', '06 90 12 34 56', 'Quick Restaurants Sud', '12345678900099', 'Quick', 8, 'Restauration rapide', 'Occitanie Sud', 12.00, 'pourcentage', 50000.00, 30, '2025-01-01', 'Montpellier', true, 'Contrat cadre annuel. Commission sur CA facture. Reporting trimestriel.');

-- Partenaire 2: Reseau boucheries
INSERT INTO apporteurs_affaires (id, organization_id, type, categorie, nom, prenom, email, telephone, raison_sociale, siret, nom_enseigne, nombre_points_vente, secteur, zone_geographique, taux_commission, mode_calcul, objectif_annuel_ca, objectif_annuel_dossiers, date_debut_contrat, ville, is_active, conditions)
VALUES (p2, org_id, 'entreprise', 'partenaire', 'Bonnard', 'Catherine', 'c.bonnard@boucheries-tradition.fr', '06 91 23 45 67', 'Boucheries Tradition SARL', '98765432100088', 'Boucheries Tradition', 5, 'Boucherie', 'Herault + Gard', 15.00, 'pourcentage', 35000.00, 20, '2025-06-01', 'Nimes', true, 'Convention partenariat 2 ans. 15% sur CA genere.');

-- Rattacher des leads existants aux partenaires
UPDATE leads SET apporteur_id = p1 WHERE entreprise = 'Quick Burger Agde' AND organization_id = org_id;
UPDATE leads SET apporteur_id = p1 WHERE contact_nom = 'Moudja' AND organization_id = org_id;

-- Token portail partenaire
INSERT INTO portal_access_tokens (organization_id, type, email, is_active, token, created_by)
VALUES
  (org_id, 'apporteur', 'michel.delattre@quick-sud.fr', true, 'test-partenaire-quick-sud', admin_id),
  (org_id, 'apporteur', 'c.bonnard@boucheries-tradition.fr', true, 'test-partenaire-boucheries', admin_id);

RAISE NOTICE 'Partenaires crees avec succes!';
RAISE NOTICE 'Portail Quick Sud:         /portail/test-partenaire-quick-sud';
RAISE NOTICE 'Portail Boucheries:        /portail/test-partenaire-boucheries';

END $$;
