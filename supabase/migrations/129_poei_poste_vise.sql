-- ============================================================
-- 129 — Poste visé du projet POEI
--
-- Le code écrit et lit `poei.poste_vise` depuis la création du module — fiche
-- POEI, reprise depuis le vivier, grilles d'évaluation, certificat signé —
-- mais la colonne n'a jamais été créée en base.
--
-- Conséquence : toute requête qui la sélectionne échoue en bloc. Le
-- téléchargement des grilles d'évaluation répondait « Projet POEI
-- introuvable », alors que le projet existait : c'est la requête qui était
-- rejetée, pas l'enregistrement qui manquait.
--
-- Le poste visé est la raison d'être d'une POEI : c'est le métier pour lequel
-- le candidat est formé, et il figure sur les documents remis à France
-- Travail.
-- ============================================================

ALTER TABLE poei
  ADD COLUMN IF NOT EXISTS poste_vise text;

COMMENT ON COLUMN poei.poste_vise IS
  'Intitulé du poste pour lequel le candidat est formé, repris sur les documents France Travail.';

-- Reprise : le poste figure déjà sur les candidats du projet.
UPDATE poei p
SET poste_vise = c.poste_vise
FROM (
  SELECT DISTINCT ON (poei_id) poei_id, poste_vise
  FROM poei_candidats
  WHERE poei_id IS NOT NULL AND poste_vise IS NOT NULL AND poste_vise <> ''
  ORDER BY poei_id, created_at
) c
WHERE p.id = c.poei_id
  AND (p.poste_vise IS NULL OR p.poste_vise = '');

-- À défaut, l'intitulé de la formation rattachée fait un poste visé correct.
UPDATE poei p
SET poste_vise = f.intitule
FROM formations f
WHERE p.formation_id = f.id
  AND (p.poste_vise IS NULL OR p.poste_vise = '');
