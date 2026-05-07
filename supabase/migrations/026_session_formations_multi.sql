-- ============================================================
-- 026 — Multi-formations par session
-- ============================================================
-- Une session peut combiner plusieurs formations (ex: HACCP + Allergènes
-- sur le même créneau). La table de jonction permet la relation M2M.
-- La colonne sessions.formation_id reste pour la formation "principale"
-- (rétrocompatibilité + affichage simple dans les listes).

CREATE TABLE IF NOT EXISTS session_formations (
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  ordre INTEGER DEFAULT 0,  -- Ordre d'affichage dans la session
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_id, formation_id)
);

CREATE INDEX IF NOT EXISTS idx_session_formations_session ON session_formations(session_id);
CREATE INDEX IF NOT EXISTS idx_session_formations_formation ON session_formations(formation_id);

COMMENT ON TABLE session_formations IS 'Relation many-to-many : une session peut couvrir plusieurs formations';

-- Backfill : copier la formation_id existante dans la table de jonction
INSERT INTO session_formations (session_id, formation_id, ordre)
SELECT id, formation_id, 0 FROM sessions
WHERE formation_id IS NOT NULL
ON CONFLICT DO NOTHING;
