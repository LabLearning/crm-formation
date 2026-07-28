-- Mémos vocaux attachés aux tâches internes (audio enregistré dans le navigateur).
-- Le fichier audio est stocké dans le bucket privé 'documents' (préfixe taches-memos/).
CREATE TABLE IF NOT EXISTS crm_taches_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tache_id uuid NOT NULL REFERENCES crm_taches(id) ON DELETE CASCADE,
  audio_path text NOT NULL,
  duree_secondes integer,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taches_memos ON crm_taches_memos(tache_id, created_at);

ALTER TABLE crm_taches_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_taches_memos_org ON crm_taches_memos
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
