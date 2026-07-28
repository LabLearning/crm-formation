-- CV et pastille d'évaluation sur les candidats du vivier.
ALTER TABLE candidats_vivier
  ADD COLUMN IF NOT EXISTS cv_url text,      -- chemin storage (bucket documents, prefixe vivier-cv/)
  ADD COLUMN IF NOT EXISTS cv_nom text,      -- nom de fichier d'origine
  ADD COLUMN IF NOT EXISTS evaluation text;  -- top | bon | moyen | a_tester (pastille appreciation)

COMMENT ON COLUMN candidats_vivier.evaluation IS
  'Pastille appreciation recruteur : top | bon | moyen | a_tester';
