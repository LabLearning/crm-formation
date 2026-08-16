-- ============================================================
-- 133 — Évaluation du profil et des compétences des formateurs
--
-- Indicateur 21 du RNQ : l'organisme détermine, mobilise et ÉVALUE les
-- compétences de ses intervenants. L'audit blanc a pointé l'absence de cette
-- évaluation formalisée — la trame du consultant (fiche d'évaluation, notes
-- 1 à 5 par compétence) devient un formulaire du CRM, une fiche par
-- formateur, rendue en PDF.
-- ============================================================

CREATE TABLE IF NOT EXISTS formateur_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  formateur_id uuid NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  -- Notes 1-5 par compétence de la trame, indexées par clé stable.
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  qualite_documentation text,
  qualite_echanges text,
  disponibilites text,
  competences_techniques text,
  synthese text,
  note_globale numeric(2,1),
  date_evaluation date NOT NULL DEFAULT CURRENT_DATE,
  evaluateur_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Une évaluation courante par formateur ; l'historique viendra si besoin.
CREATE UNIQUE INDEX IF NOT EXISTS formateur_evaluations_unique
  ON formateur_evaluations (formateur_id);

COMMENT ON TABLE formateur_evaluations IS
  'Fiche d''évaluation du profil et des compétences de chaque formateur (indicateur 21) — trame de l''audit blanc d''août 2026.';
