-- ============================================================
-- 134 — Appréciations des entreprises et des financeurs
--
-- Indicateur 30 : le recueil des appréciations couvre TOUTES les parties
-- prenantes. Stagiaires et équipe pédagogique étaient recueillis ; les
-- entreprises clientes et les financeurs ne l'étaient pas — c'est le
-- blocage relevé à l'audit blanc.
--
-- Le recueil passe par un formulaire public par lien (comme la réclamation) :
-- l'entreprise note la prestation de sa session, le financeur donne son
-- appréciation annuelle sur la relation.
-- ============================================================

CREATE TABLE IF NOT EXISTS appreciations_parties_prenantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  -- entreprise (rattachée à une session) ou financeur (annuel, sans session)
  type text NOT NULL DEFAULT 'entreprise',
  session_id uuid REFERENCES sessions(id),
  client_id uuid REFERENCES clients(id),
  note_globale int CHECK (note_globale BETWEEN 1 AND 5),
  note_organisation int CHECK (note_organisation BETWEEN 1 AND 5),
  note_intervenant int CHECK (note_intervenant BETWEEN 1 AND 5),
  recommande boolean,
  commentaire text,
  repondant_nom text,
  repondant_fonction text,
  repondant_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appreciations_pp_session ON appreciations_parties_prenantes (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS appreciations_pp_org ON appreciations_parties_prenantes (organization_id, type);

COMMENT ON TABLE appreciations_parties_prenantes IS
  'Appréciations des entreprises clientes (par session) et des financeurs (annuelles) — indicateur 30 du RNQ.';
