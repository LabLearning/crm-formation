-- Frais formateur saisis manuellement sur un dossier (utilisés pour la
-- commission « budget net » 40% quand aucun contrat formateur n'existe).
ALTER TABLE dossiers_formation
  ADD COLUMN IF NOT EXISTS cout_formateur_manuel numeric;

COMMENT ON COLUMN dossiers_formation.cout_formateur_manuel IS
  'Frais formateur saisis a la main ; sert de base au 40% net si pas de contrat formateur.';
