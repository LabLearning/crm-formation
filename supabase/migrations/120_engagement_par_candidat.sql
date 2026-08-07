-- ============================================================
-- 120 — Le n° d'engagement France Travail est attribué PAR CANDIDAT
-- Chaque candidat d'une POEI a son propre engagement financier, repris sur sa
-- facture. Le numéro porté par le dossier (migration 118) ne sert plus que de
-- valeur par défaut lorsqu'un candidat n'a pas encore le sien.
-- ============================================================

ALTER TABLE poei_candidats
  ADD COLUMN IF NOT EXISTS numero_engagement text;

COMMENT ON COLUMN poei_candidats.numero_engagement IS 'N° d''engagement France Travail du candidat, imprimé sur sa facture';
COMMENT ON COLUMN poei.numero_engagement IS 'N° d''engagement par défaut du dossier (les candidats ont le leur)';
