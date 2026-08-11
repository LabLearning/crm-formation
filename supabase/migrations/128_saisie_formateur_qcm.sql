-- ============================================================
-- 128 — Saisie d'un questionnaire pour le compte d'un stagiaire
--
-- En restauration rapide, le positionnement et l'évaluation des acquis sont
-- conduits oralement, stagiaire par stagiaire. Le stagiaire ne remplit rien
-- lui-même : le formateur recueille, puis quelqu'un reporte dans l'outil.
--
-- Cette transcription doit se voir. Un questionnaire renseigné pour le compte
-- d'un stagiaire n'a pas la même valeur probante qu'une réponse saisie par
-- l'intéressé, et le masquer serait une faute : c'est justement parce qu'elle
-- est assumée et tracée que la transcription est défendable devant un
-- auditeur.
--
-- Trois dates coexistent désormais, et chacune dit une chose différente :
--   date_realisation — quand l'entretien a eu lieu avec le stagiaire ;
--   saisi_le         — quand les réponses ont été reportées dans l'outil ;
--   completed_at     — horodatage technique de la soumission.
-- ============================================================

ALTER TABLE qcm_reponses
  ADD COLUMN IF NOT EXISTS saisi_par uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS saisi_le timestamptz;

COMMENT ON COLUMN qcm_reponses.saisi_par IS
  'Utilisateur ayant reporté des réponses recueillies auprès du stagiaire. Nul si le stagiaire a répondu lui-même.';
COMMENT ON COLUMN qcm_reponses.saisi_le IS
  'Horodatage de la transcription, distinct de date_realisation qui porte la date de l''entretien.';

CREATE INDEX IF NOT EXISTS idx_qcm_reponses_saisie ON qcm_reponses(saisi_par)
  WHERE saisi_par IS NOT NULL;
