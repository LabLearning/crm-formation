-- ============================================================
-- 100 — Agences France Travail (destinataire de facturation POEI)
-- ============================================================
-- En POEI, la formation est financée par France Travail : la facture est
-- adressée à l'AGENCE France Travail (pas à l'entreprise), avec une mention
-- « Pour le compte de : <entreprise> ».
--
--  • agences_france_travail : référentiel d'agences réutilisables
--  • poei.agence_ft_id       : agence rattachée au projet
--  • factures.agence_ft_id   : agence destinataire de la facture (le client
--                              reste l'entreprise = « pour le compte de »)
-- ============================================================

CREATE TABLE IF NOT EXISTS agences_france_travail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,                 -- ex: FRANCE TRAVAIL DR OCCITANIE
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  siret TEXT,
  tva_intra TEXT,
  email TEXT,
  telephone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agences_ft_org ON agences_france_travail(organization_id, is_active);

ALTER TABLE poei ADD COLUMN IF NOT EXISTS agence_ft_id UUID REFERENCES agences_france_travail(id) ON DELETE SET NULL;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS agence_ft_id UUID REFERENCES agences_france_travail(id) ON DELETE SET NULL;
