-- Couleurs de marque d'une franchise (hex), pour les documents brandés du
-- studio formateur. Déduites du logo par l'IA à la première génération,
-- modifiables ensuite.
ALTER TABLE franchises
  ADD COLUMN IF NOT EXISTS couleur_primaire text,
  ADD COLUMN IF NOT EXISTS couleur_secondaire text;
