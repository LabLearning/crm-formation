-- Nom commercial / enseigne du client (distinct de la raison sociale légale).
-- Ex : société « ANNAYA » exploitée sous l'enseigne « Dreams Donuts Narbonne ».
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nom_commercial text;

COMMENT ON COLUMN clients.nom_commercial IS
  'Nom commercial / enseigne (ex: Dreams Donuts Narbonne pour la société ANNAYA)';
