-- ============================================================
-- 127 — Date de réalisation des évaluations
--
-- En restauration rapide, le formateur conduit le positionnement stagiaire
-- par stagiaire le premier jour, et l'évaluation des acquis le dernier. La
-- saisie dans l'outil, elle, intervient plus tard — parfois le soir même,
-- parfois à la clôture du dossier.
--
-- Confondre les deux dates donne une chronologie fausse : un positionnement
-- horodaté après la fin de la formation n'a aucun sens pédagogique et
-- interroge légitimement un auditeur.
--
-- On sépare donc :
--   * date_realisation — quand l'évaluation a eu lieu avec le stagiaire ;
--     c'est elle qui s'affiche et qui figure sur les documents ;
--   * completed_at — quand la réponse a été enregistrée dans l'outil ;
--     conservée, jamais réécrite. C'est la piste d'audit, et c'est elle qui
--     permet d'expliquer l'écart plutôt que de le masquer.
-- ============================================================

ALTER TABLE qcm_reponses
  ADD COLUMN IF NOT EXISTS date_realisation date;

COMMENT ON COLUMN qcm_reponses.date_realisation IS
  'Date de l''acte pédagogique (jour 1 pour le positionnement, dernier jour pour les acquis). La saisie reste horodatée par completed_at.';

ALTER TABLE evaluations_satisfaction
  ADD COLUMN IF NOT EXISTS date_realisation date;

COMMENT ON COLUMN evaluations_satisfaction.date_realisation IS
  'Date de recueil de la satisfaction auprès du stagiaire, distincte de la date de saisie.';

CREATE INDEX IF NOT EXISTS idx_qcm_reponses_realisation ON qcm_reponses(session_id, date_realisation);

-- ── Reprise de l'existant ───────────────────────────────────────────────────
-- Positionnement et diagnostic d'entrée : premier jour de la session.
UPDATE qcm_reponses r
SET date_realisation = s.date_debut
FROM qcm q, sessions s
WHERE r.qcm_id = q.id
  AND r.session_id = s.id
  AND r.date_realisation IS NULL
  AND q.type IN ('positionnement', 'entree');

-- Évaluation des acquis et satisfaction à chaud : dernier jour.
UPDATE qcm_reponses r
SET date_realisation = COALESCE(s.date_fin, s.date_debut)
FROM qcm q, sessions s
WHERE r.qcm_id = q.id
  AND r.session_id = s.id
  AND r.date_realisation IS NULL
  AND q.type IN ('sortie', 'satisfaction_chaud', 'evaluation_formateur');

-- Satisfaction à froid : par construction différée, on la laisse à sa date de
-- saisie plutôt que de la rattacher artificiellement à la session.
UPDATE qcm_reponses r
SET date_realisation = COALESCE(r.completed_at::date, r.created_at::date)
FROM qcm q
WHERE r.qcm_id = q.id
  AND r.date_realisation IS NULL
  AND q.type = 'satisfaction_froid';

-- Le reste : à défaut de mieux, la date de saisie.
UPDATE qcm_reponses
SET date_realisation = COALESCE(completed_at::date, created_at::date)
WHERE date_realisation IS NULL;

-- La table evaluations_satisfaction est vide en base : la colonne est ajoutée
-- pour l'avenir, il n'y a rien à reprendre.

-- ── La règle tient en base, pas dans le code ────────────────────────────────
-- Une réponse créée par le portail, par une reprise ou par un écran du CRM
-- doit porter la même date de réalisation. Câbler l'appel dans chaque chemin
-- d'écriture ne tient jamais : le suivant repart sans.

CREATE OR REPLACE FUNCTION qcm_date_realisation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
  d date;
  f date;
BEGIN
  IF NEW.date_realisation IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT type INTO t FROM qcm WHERE id = NEW.qcm_id;
  SELECT date_debut, COALESCE(date_fin, date_debut) INTO d, f
  FROM sessions WHERE id = NEW.session_id;

  IF d IS NULL THEN
    NEW.date_realisation := COALESCE(NEW.completed_at::date, CURRENT_DATE);
    RETURN NEW;
  END IF;

  NEW.date_realisation := CASE
    -- Le positionnement ouvre la formation, l'évaluation la referme.
    WHEN t IN ('positionnement', 'entree') THEN d
    WHEN t IN ('sortie', 'satisfaction_chaud', 'evaluation_formateur') THEN f
    -- La satisfaction à froid est différée par nature : sa date de saisie
    -- est sa vraie date, la rattacher à la session serait un contresens.
    ELSE COALESCE(NEW.completed_at::date, CURRENT_DATE)
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qcm_date_realisation ON qcm_reponses;
CREATE TRIGGER trg_qcm_date_realisation
  BEFORE INSERT ON qcm_reponses
  FOR EACH ROW
  EXECUTE FUNCTION qcm_date_realisation();
