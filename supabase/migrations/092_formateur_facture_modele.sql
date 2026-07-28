-- Modèle de facture choisi par le formateur pour ses factures de prestation
-- (style du PDF généré : 'epure' | 'classique' | 'moderne').
ALTER TABLE formateurs
  ADD COLUMN IF NOT EXISTS facture_modele text NOT NULL DEFAULT 'epure';

COMMENT ON COLUMN formateurs.facture_modele IS
  'Style du PDF de facture de prestation du formateur : epure | classique | moderne';
