-- ══════════════════════════════════════════════════════════════
-- Migration: Ajout champs Partenaire/Franchise sur apporteurs
-- Execute dans Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

ALTER TABLE apporteurs_affaires
  ADD COLUMN IF NOT EXISTS categorie TEXT DEFAULT 'apporteur', -- 'apporteur' ou 'partenaire'
  ADD COLUMN IF NOT EXISTS nom_enseigne TEXT,            -- Nom de la franchise/enseigne
  ADD COLUMN IF NOT EXISTS nombre_points_vente INTEGER,  -- Nb de restaurants/boutiques
  ADD COLUMN IF NOT EXISTS secteur TEXT,                 -- HCR, Boucherie, Boulangerie...
  ADD COLUMN IF NOT EXISTS zone_geographique TEXT,       -- Region couverte
  ADD COLUMN IF NOT EXISTS objectif_annuel_ca DECIMAL(12,2), -- Objectif CA annuel
  ADD COLUMN IF NOT EXISTS objectif_annuel_dossiers INTEGER; -- Objectif nb dossiers/an
