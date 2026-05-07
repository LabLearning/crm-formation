-- ============================================================
-- 025 — Sessions : type (inter/intra), client, modalité, horaires détaillés
-- ============================================================
-- Enrichit la session pour coller au métier Lab Learning :
-- - Type inter : formation ouverte → adresse libre (centre Lab Learning)
-- - Type intra : formation chez le client → adresse auto = adresse client
-- - Modalité : présentiel ou distanciel (avec lien visio)
-- - Horaires détaillés par jour (matin + après-midi)

CREATE TYPE session_type AS ENUM ('inter', 'intra');
CREATE TYPE session_modalite AS ENUM ('presentiel', 'distanciel', 'mixte');

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS type_session session_type DEFAULT 'inter',
  ADD COLUMN IF NOT EXISTS modalite session_modalite DEFAULT 'presentiel',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS horaires_jours JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_sessions_client ON sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(organization_id, type_session);

COMMENT ON COLUMN sessions.type_session IS 'inter (groupe ouvert) | intra (chez un client)';
COMMENT ON COLUMN sessions.modalite IS 'presentiel | distanciel | mixte';
COMMENT ON COLUMN sessions.client_id IS 'Client commanditaire (obligatoire pour intra)';
COMMENT ON COLUMN sessions.horaires_jours IS 'Tableau JSON : [{date, matin_debut, matin_fin, aprem_debut, aprem_fin}]';
