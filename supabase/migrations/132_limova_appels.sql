-- ============================================================
-- 132 — Traçabilité des appels Limova
--
-- Règle d'or de la maison, étendue au téléphone : tout envoi vers l'extérieur
-- doit avoir son historique visible — qui a été appelé, quand, pourquoi, avec
-- quel résultat. Un appel automatique non consigné ne vaut rien à l'audit et
-- rend le canal ingérable (« est-ce qu'on l'a déjà appelé ? »).
--
-- Deux tables : la campagne (le lot d'appels et son intention métier) et
-- l'appel (le destinataire, son rattachement CRM, la transcription rapatriée).
-- ============================================================

CREATE TABLE IF NOT EXISTS limova_campagnes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  -- L'identifiant de la campagne chez Limova.
  limova_id text NOT NULL,
  -- L'intention métier : relance_questionnaires, confirmation_j1,
  -- relance_pieces_formateur, prospection…
  usage text NOT NULL,
  nom text NOT NULL,
  instructions text,
  statut text NOT NULL DEFAULT 'brouillon',
  session_id uuid REFERENCES sessions(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS limova_campagnes_limova_id ON limova_campagnes (limova_id);

CREATE TABLE IF NOT EXISTS limova_appels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  campagne_id uuid NOT NULL REFERENCES limova_campagnes(id) ON DELETE CASCADE,
  -- L'identifiant du journal d'appel chez Limova, pour l'idempotence du
  -- rapatriement.
  limova_call_id text,
  telephone text NOT NULL,
  -- Le rattachement CRM : c'est lui qui rend l'appel visible sur la fiche.
  apprenant_id uuid REFERENCES apprenants(id),
  formateur_id uuid REFERENCES formateurs(id),
  contact_nom text,
  statut text NOT NULL DEFAULT 'planifie',
  duree_secondes int,
  resume text,
  transcription text,
  appele_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS limova_appels_call_id ON limova_appels (limova_call_id) WHERE limova_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS limova_appels_apprenant ON limova_appels (apprenant_id) WHERE apprenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS limova_appels_campagne ON limova_appels (campagne_id);

COMMENT ON TABLE limova_campagnes IS 'Campagnes d''appels sortants pilotées via l''API Limova (agent téléphonique).';
COMMENT ON TABLE limova_appels IS 'Un appel par destinataire, rattaché à sa fiche CRM, avec résumé et transcription rapatriés de Limova.';
