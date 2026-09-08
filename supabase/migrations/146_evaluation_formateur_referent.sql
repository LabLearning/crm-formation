-- ============================================================
-- 146 — Évaluation du formateur par le référent de l'établissement
--
-- Le référent de la formation (contact client) note chaque formateur
-- intervenu sur la POEI ou la session : questionnaire dédié, un lien à
-- jeton par formateur, envoyé par email avec aperçu. Même registre que les
-- appréciations des parties prenantes (indicateur 30), type
-- 'evaluation_formateur'. La demande est créée à l'envoi (statut 'envoye')
-- et devient une réponse quand le référent valide le formulaire.
-- ============================================================

ALTER TABLE appreciations_parties_prenantes
  ADD COLUMN IF NOT EXISTS formateur_id uuid REFERENCES formateurs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS poei_id uuid REFERENCES poei(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'repondu',
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS repondu_at timestamptz,
  ADD COLUMN IF NOT EXISTS note_ponctualite int CHECK (note_ponctualite BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS note_pedagogie int CHECK (note_pedagogie BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS note_maitrise int CHECK (note_maitrise BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS note_relationnel int CHECK (note_relationnel BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS note_adaptation int CHECK (note_adaptation BETWEEN 1 AND 5);

CREATE UNIQUE INDEX IF NOT EXISTS appreciations_pp_token ON appreciations_parties_prenantes (token);
CREATE INDEX IF NOT EXISTS appreciations_pp_formateur ON appreciations_parties_prenantes (formateur_id) WHERE formateur_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS appreciations_pp_poei ON appreciations_parties_prenantes (poei_id) WHERE poei_id IS NOT NULL;

COMMENT ON COLUMN appreciations_parties_prenantes.statut IS
  'envoye = questionnaire envoyé, en attente ; repondu = réponse enregistrée (valeur des lignes historiques).';
