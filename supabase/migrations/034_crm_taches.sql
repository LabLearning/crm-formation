-- ============================================================
-- 034 — Tâches internes CRM (Trello-like)
-- ============================================================
-- Page Tâches accessible à toute l'équipe interne, organisée en
-- colonnes Kanban : a_faire / en_cours / en_revue / terminee.
-- - assignee_id : utilisateur qui doit faire la tâche
-- - position : ordre dans la colonne (drag & drop)
-- - entity_type / entity_id : lien optionnel vers Lead/Dossier/Session/Client/Formation
-- ============================================================

CREATE TYPE crm_tache_status AS ENUM (
  'a_faire',
  'en_cours',
  'en_revue',
  'terminee'
);

CREATE TYPE crm_tache_priorite AS ENUM (
  'basse',
  'moyenne',
  'haute',
  'urgente'
);

CREATE TABLE IF NOT EXISTS crm_taches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  status crm_tache_status NOT NULL DEFAULT 'a_faire',
  priorite crm_tache_priorite NOT NULL DEFAULT 'moyenne',
  -- Assignation
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Échéance
  due_date DATE,
  -- Ordre dans la colonne (drag & drop)
  position INTEGER NOT NULL DEFAULT 0,
  -- Étiquettes libres
  labels TEXT[],
  -- Lien optionnel vers une entité CRM
  entity_type TEXT,  -- 'lead' | 'dossier' | 'session' | 'client' | 'formation' | null
  entity_id UUID,
  entity_label TEXT, -- libellé snapshot pour affichage rapide
  -- État
  archived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taches_org_status ON crm_taches(organization_id, status, position);
CREATE INDEX IF NOT EXISTS idx_taches_assignee ON crm_taches(assignee_id, status) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taches_entity ON crm_taches(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taches_due ON crm_taches(organization_id, due_date) WHERE due_date IS NOT NULL AND status != 'terminee';

CREATE TRIGGER tr_crm_taches_updated_at
  BEFORE UPDATE ON crm_taches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Commentaires sur les tâches (fil d'activité)
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_taches_commentaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tache_id UUID NOT NULL REFERENCES crm_taches(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  contenu TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taches_comm_tache ON crm_taches_commentaires(tache_id, created_at DESC);
