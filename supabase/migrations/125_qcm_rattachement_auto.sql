-- Rattachement automatique des questionnaires aux stagiaires.
--
-- Un stagiaire inscrit après le rattachement des questionnaires à sa session
-- n'avait aucune ligne dans qcm_reponses : ni positionnement, ni évaluation des
-- acquis, ni satisfaction. Pour l'auditeur, c'est un stagiaire sans preuve.
--
-- Neuf endroits du code créent des inscriptions (dashboard, portail formateur,
-- POEI, vivier, changements, reprise Dendreo…). Câbler l'appel dans chacun n'a
-- pas tenu : le dixième repartira cassé. La règle est donc portée par la base,
-- où aucun chemin d'écriture ne peut la contourner.
--
-- Deux déclencheurs symétriques, car l'ordre des opérations varie :
--   * un stagiaire arrive après les questionnaires  → trigger sur inscriptions
--   * un questionnaire arrive après les stagiaires  → trigger sur qcm_sessions

CREATE OR REPLACE FUNCTION qcm_rattacher_inscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Un stagiaire annulé ou en abandon n'a pas à passer les questionnaires.
  IF NEW.status IN ('annule', 'abandonne') THEN
    RETURN NEW;
  END IF;

  INSERT INTO qcm_reponses (organization_id, qcm_id, qcm_session_id, session_id, apprenant_id, is_complete)
  SELECT NEW.organization_id, qs.qcm_id, qs.id, NEW.session_id, NEW.apprenant_id, false
  FROM qcm_sessions qs
  WHERE qs.session_id = NEW.session_id
    AND NOT EXISTS (
      SELECT 1 FROM qcm_reponses r
      WHERE r.session_id = NEW.session_id
        AND r.qcm_id = qs.qcm_id
        AND r.apprenant_id = NEW.apprenant_id
    );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION qcm_rattacher_questionnaire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO qcm_reponses (organization_id, qcm_id, qcm_session_id, session_id, apprenant_id, is_complete)
  SELECT i.organization_id, NEW.qcm_id, NEW.id, NEW.session_id, i.apprenant_id, false
  FROM inscriptions i
  WHERE i.session_id = NEW.session_id
    AND i.status NOT IN ('annule', 'abandonne')
    AND NOT EXISTS (
      SELECT 1 FROM qcm_reponses r
      WHERE r.session_id = NEW.session_id
        AND r.qcm_id = NEW.qcm_id
        AND r.apprenant_id = i.apprenant_id
    );

  RETURN NEW;
END;
$$;

-- Une inscription annulée puis réactivée doit récupérer ses questionnaires :
-- le déclencheur couvre donc aussi la mise à jour du statut.
DROP TRIGGER IF EXISTS trg_qcm_rattacher_inscription ON inscriptions;
CREATE TRIGGER trg_qcm_rattacher_inscription
  AFTER INSERT OR UPDATE OF status ON inscriptions
  FOR EACH ROW
  EXECUTE FUNCTION qcm_rattacher_inscription();

DROP TRIGGER IF EXISTS trg_qcm_rattacher_questionnaire ON qcm_sessions;
CREATE TRIGGER trg_qcm_rattacher_questionnaire
  AFTER INSERT ON qcm_sessions
  FOR EACH ROW
  EXECUTE FUNCTION qcm_rattacher_questionnaire();

-- Rattrapage de l'existant : tout stagiaire actif d'une session dont les
-- questionnaires sont rattachés doit avoir sa ligne.
INSERT INTO qcm_reponses (organization_id, qcm_id, qcm_session_id, session_id, apprenant_id, is_complete)
SELECT i.organization_id, qs.qcm_id, qs.id, i.session_id, i.apprenant_id, false
FROM inscriptions i
JOIN qcm_sessions qs ON qs.session_id = i.session_id
WHERE i.status NOT IN ('annule', 'abandonne')
  AND NOT EXISTS (
    SELECT 1 FROM qcm_reponses r
    WHERE r.session_id = i.session_id
      AND r.qcm_id = qs.qcm_id
      AND r.apprenant_id = i.apprenant_id
  );
