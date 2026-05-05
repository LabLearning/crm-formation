-- ============================================================
-- 017 — Mapping OPCO : codes NAF, IDCC, statut compte client
-- ============================================================
-- Objectif : auto-détecter l'OPCO d'une entreprise depuis son code NAF
-- ou sa convention collective (IDCC), et tracer le statut du compte OPCO.

-- ============================================================
-- TABLE : opco (les 11 OPCOs officiels)
-- ============================================================
CREATE TABLE opco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- AKTO, OPCO_EP, AFDAS, etc.
  nom TEXT NOT NULL,
  nom_complet TEXT,
  site_web TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapping code NAF → OPCO (un NAF peut aller à plusieurs OPCO selon IDCC, mais en pratique on prend l'OPCO majoritaire)
CREATE TABLE opco_naf_codes (
  opco_id UUID NOT NULL REFERENCES opco(id) ON DELETE CASCADE,
  code_naf TEXT NOT NULL, -- Format NAF: "56.10A", "47.22Z"
  libelle TEXT,
  PRIMARY KEY (opco_id, code_naf)
);
CREATE INDEX idx_opco_naf_code ON opco_naf_codes(code_naf);

-- Mapping IDCC (convention collective) → OPCO
CREATE TABLE opco_idcc_codes (
  opco_id UUID NOT NULL REFERENCES opco(id) ON DELETE CASCADE,
  code_idcc TEXT NOT NULL, -- Ex: "1979" pour HCR
  libelle_convention TEXT,
  PRIMARY KEY (opco_id, code_idcc)
);
CREATE INDEX idx_opco_idcc_code ON opco_idcc_codes(code_idcc);

-- ============================================================
-- ENUM : statut du compte OPCO du client
-- ============================================================
CREATE TYPE opco_compte_status AS ENUM (
  'aucun',                -- Pas de compte OPCO
  'courrier_envoye',      -- Demande d'ouverture envoyée par courrier
  'en_attente_validation',-- En attente de validation OPCO
  'actif',                -- Compte actif
  'inactif'               -- Compte désactivé
);

-- ============================================================
-- ALTER : clients (ajout opco_id + statut + IDCC)
-- ============================================================
ALTER TABLE clients
  ADD COLUMN opco_id UUID REFERENCES opco(id) ON DELETE SET NULL,
  ADD COLUMN opco_compte_status opco_compte_status DEFAULT 'aucun',
  ADD COLUMN code_idcc TEXT,
  ADD COLUMN convention_collective TEXT;

CREATE INDEX idx_clients_opco ON clients(opco_id);

COMMENT ON COLUMN clients.opco_id IS 'OPCO de rattachement, auto-détecté depuis code_naf ou code_idcc';
COMMENT ON COLUMN clients.opco_compte_status IS 'Statut du compte OPCO du client (workflow)';
COMMENT ON COLUMN clients.code_idcc IS 'Code IDCC de la convention collective (ex: 1979 pour HCR)';

-- ============================================================
-- SEED : les 11 OPCOs
-- ============================================================
INSERT INTO opco (code, nom, nom_complet, site_web, description) VALUES
  ('AKTO', 'AKTO', 'AKTO — Opérateur de compétences des services à forte intensité de main d''œuvre', 'https://www.akto.fr', 'HCR, restauration rapide, propreté, sécurité, intérim'),
  ('OPCO_EP', 'OPCO EP', 'OPCO des Entreprises de Proximité', 'https://www.opcoep.fr', 'Artisanat, professions libérales, services de proximité (boulangerie, boucherie, pâtisserie, coiffure, automobile...)'),
  ('OPCOMMERCE', 'OPCOMMERCE', 'OPCOMMERCE — OPCO du commerce', 'https://www.lopcommerce.com', 'Commerce de gros, commerce de détail, e-commerce'),
  ('AFDAS', 'AFDAS', 'AFDAS — Culture, médias, sport, loisirs, tourisme', 'https://www.afdas.com', 'Spectacle, audiovisuel, presse, tourisme, sport, loisirs'),
  ('ATLAS', 'ATLAS', 'ATLAS — Services financiers et conseil', 'https://www.opco-atlas.fr', 'Banque, assurance, conseil, expertise comptable'),
  ('CONSTRUCTYS', 'Constructys', 'Constructys — OPCO de la construction', 'https://www.constructys.fr', 'BTP, travaux publics'),
  ('OCAPIAT', 'OCAPIAT', 'OCAPIAT — Coopération agricole, agriculture, pêche, agro-alimentaire', 'https://www.ocapiat.fr', 'Agriculture, agro-alimentaire, pêche, coopératives'),
  ('OPCO_2I', 'OPCO 2i', 'OPCO interindustriel', 'https://www.opco2i.fr', 'Métallurgie, plasturgie, textile, papier, ameublement'),
  ('OPCO_MOBILITES', 'OPCO Mobilités', 'OPCO Mobilités — Transport et logistique', 'https://www.opcomobilites.fr', 'Transport routier, ferroviaire, maritime, aérien, logistique'),
  ('OPCO_SANTE', 'OPCO Santé', 'OPCO Santé', 'https://www.opco-sante.fr', 'Hospitalisation privée, médico-social, ambulanciers'),
  ('UNIFORMATION', 'Uniformation', 'Uniformation — Cohésion sociale', 'https://www.uniformation.fr', 'Économie sociale et solidaire, action sociale, animation, sport amateur');

-- ============================================================
-- SEED : codes NAF AKTO (HCR + restauration rapide)
-- ============================================================
INSERT INTO opco_naf_codes (opco_id, code_naf, libelle)
SELECT id, naf.code_naf, naf.libelle FROM opco, (VALUES
  ('55.10Z', 'Hôtels et hébergement similaire'),
  ('55.20Z', 'Hébergement touristique et autre hébergement de courte durée'),
  ('55.30Z', 'Terrains de camping et parcs pour caravanes ou véhicules de loisirs'),
  ('55.90Z', 'Autres hébergements'),
  ('56.10A', 'Restauration traditionnelle'),
  ('56.10B', 'Cafétérias et autres libres-services'),
  ('56.10C', 'Restauration de type rapide'),
  ('56.21Z', 'Services des traiteurs'),
  ('56.29A', 'Restauration collective sous contrat'),
  ('56.29B', 'Autres services de restauration n.c.a.'),
  ('56.30Z', 'Débits de boissons'),
  ('81.21Z', 'Nettoyage courant des bâtiments'),
  ('81.22Z', 'Autres activités de nettoyage des bâtiments et nettoyage industriel'),
  ('80.10Z', 'Activités de sécurité privée'),
  ('78.20Z', 'Activités des agences de travail temporaire')
) AS naf(code_naf, libelle)
WHERE opco.code = 'AKTO';

-- ============================================================
-- SEED : codes NAF OPCO EP (boulangerie, boucherie, pâtisserie, artisanat)
-- ============================================================
INSERT INTO opco_naf_codes (opco_id, code_naf, libelle)
SELECT id, naf.code_naf, naf.libelle FROM opco, (VALUES
  ('10.71B', 'Cuisson de produits de boulangerie'),
  ('10.71C', 'Boulangerie et boulangerie-pâtisserie'),
  ('10.71D', 'Pâtisserie'),
  ('10.13B', 'Charcuterie'),
  ('10.11Z', 'Transformation et conservation de la viande de boucherie'),
  ('10.12Z', 'Transformation et conservation de la viande de volaille'),
  ('47.22Z', 'Commerce de détail de viandes et de produits à base de viande en magasin spécialisé'),
  ('47.24Z', 'Commerce de détail de pain, pâtisserie et confiserie en magasin spécialisé'),
  ('47.23Z', 'Commerce de détail de poissons, crustacés et mollusques en magasin spécialisé'),
  ('96.02A', 'Coiffure'),
  ('96.02B', 'Soins de beauté'),
  ('45.20A', 'Entretien et réparation de véhicules automobiles légers'),
  ('45.20B', 'Entretien et réparation d''autres véhicules automobiles'),
  ('43.21A', 'Travaux d''installation électrique dans tous locaux'),
  ('43.22A', 'Travaux d''installation d''eau et de gaz en tous locaux'),
  ('86.23Z', 'Pratique dentaire'),
  ('75.00Z', 'Activités vétérinaires'),
  ('69.10Z', 'Activités juridiques'),
  ('86.21Z', 'Activité des médecins généralistes')
) AS naf(code_naf, libelle)
WHERE opco.code = 'OPCO_EP';

-- ============================================================
-- SEED : codes IDCC AKTO (les principales conventions)
-- ============================================================
INSERT INTO opco_idcc_codes (opco_id, code_idcc, libelle_convention)
SELECT id, idcc.code, idcc.lib FROM opco, (VALUES
  ('1979', 'Hôtels, cafés, restaurants (HCR)'),
  ('1501', 'Restauration rapide'),
  ('1266', 'Personnel des entreprises de restauration de collectivités'),
  ('3043', 'Propreté'),
  ('3203', 'Prévention et sécurité'),
  ('2378', 'Casinos')
) AS idcc(code, lib)
WHERE opco.code = 'AKTO';

-- ============================================================
-- SEED : codes IDCC OPCO EP
-- ============================================================
INSERT INTO opco_idcc_codes (opco_id, code_idcc, libelle_convention)
SELECT id, idcc.code, idcc.lib FROM opco, (VALUES
  ('843', 'Boulangerie-pâtisserie (entreprises artisanales)'),
  ('1747', 'Boulangerie-pâtisserie industrielle'),
  ('992', 'Boucherie, boucherie-charcuterie, boucherie hippophagique, triperie'),
  ('953', 'Charcuterie de détail'),
  ('1267', 'Pâtisserie'),
  ('3232', 'Coiffure et professions connexes'),
  ('1978', 'Fleuristes, vente et services des animaux familiers'),
  ('1090', 'Services de l''automobile')
) AS idcc(code, lib)
WHERE opco.code = 'OPCO_EP';

-- ============================================================
-- SEED : codes IDCC autres OPCOs (les + courants)
-- ============================================================
INSERT INTO opco_idcc_codes (opco_id, code_idcc, libelle_convention)
SELECT id, '2120', 'Banques' FROM opco WHERE code = 'ATLAS';
INSERT INTO opco_idcc_codes (opco_id, code_idcc, libelle_convention)
SELECT id, '1672', 'Sociétés d''assurances' FROM opco WHERE code = 'ATLAS';
INSERT INTO opco_idcc_codes (opco_id, code_idcc, libelle_convention)
SELECT id, '1486', 'Bureaux d''études techniques (Syntec)' FROM opco WHERE code = 'ATLAS';
INSERT INTO opco_idcc_codes (opco_id, code_idcc, libelle_convention)
SELECT id, '1596', 'Bâtiment ouvriers (entreprises occupant jusqu''à 10 salariés)' FROM opco WHERE code = 'CONSTRUCTYS';
INSERT INTO opco_idcc_codes (opco_id, code_idcc, libelle_convention)
SELECT id, '1597', 'Bâtiment ouvriers (entreprises occupant plus de 10 salariés)' FROM opco WHERE code = 'CONSTRUCTYS';
