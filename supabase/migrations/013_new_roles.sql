-- ============================================================
-- MIGRATION 013 : Nouveaux rôles — Directeur Commercial + Apporteur d'Affaires
-- ============================================================

-- Ajouter les nouveaux rôles à l'enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'directeur_commercial';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'apporteur_affaires';

-- Lier un apporteur d'affaires à son compte utilisateur (optionnel)
ALTER TABLE apporteurs_affaires ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_apporteurs_user ON apporteurs_affaires(user_id);

-- ============================================================
-- Seed permissions pour les nouveaux rôles (toutes les orgs existantes)
-- ============================================================

DO $$
DECLARE
  org RECORD;
  modules TEXT[] := ARRAY[
    'leads', 'clients', 'contacts', 'apporteurs',
    'formations', 'sessions', 'apprenants', 'formateurs',
    'devis', 'conventions', 'factures', 'paiements',
    'documents', 'signatures', 'qcm', 'evaluations',
    'reclamations', 'qualiopi', 'reporting', 'settings', 'users'
  ];
  m TEXT;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    FOREACH m IN ARRAY modules LOOP

      -- Directeur Commercial :
      --   CRUD complet sur : leads, clients, contacts, apporteurs, devis
      --   Lecture sur : formations, sessions, apprenants, reporting, users
      INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
      VALUES (
        org.id,
        'directeur_commercial',
        m,
        CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis') THEN true ELSE false END,
        CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis','formations','sessions','apprenants','reporting','users') THEN true ELSE false END,
        CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis') THEN true ELSE false END,
        CASE WHEN m IN ('leads','clients','contacts','devis') THEN true ELSE false END
      )
      ON CONFLICT (organization_id, role, module) DO NOTHING;

      -- Apporteur d'Affaires (dashboard) :
      --   Create/Read/Update sur : leads
      --   Lecture sur : clients, formations, sessions, apporteurs
      INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
      VALUES (
        org.id,
        'apporteur_affaires',
        m,
        CASE WHEN m IN ('leads') THEN true ELSE false END,
        CASE WHEN m IN ('leads','clients','formations','sessions','apporteurs') THEN true ELSE false END,
        CASE WHEN m IN ('leads') THEN true ELSE false END,
        false
      )
      ON CONFLICT (organization_id, role, module) DO NOTHING;

    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- Mettre à jour la fonction seed_default_permissions
-- pour inclure les nouveaux rôles (futures organisations)
-- ============================================================

CREATE OR REPLACE FUNCTION seed_default_permissions(org_id UUID)
RETURNS VOID AS $$
DECLARE
  modules TEXT[] := ARRAY[
    'leads', 'clients', 'contacts', 'apporteurs',
    'formations', 'sessions', 'apprenants', 'formateurs',
    'devis', 'conventions', 'factures', 'paiements',
    'documents', 'signatures', 'qcm', 'evaluations',
    'reclamations', 'qualiopi', 'reporting', 'settings', 'users'
  ];
  m TEXT;
BEGIN
  FOREACH m IN ARRAY modules LOOP
    -- Super Admin : tout
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'super_admin', m, true, true, true, true)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

    -- Gestionnaire : tout sauf settings/users en delete
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'gestionnaire', m, true, true, true,
      CASE WHEN m IN ('settings', 'users') THEN false ELSE true END)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

    -- Directeur Commercial : CRUD commercial + lecture formations/reporting/users
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'directeur_commercial', m,
      CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis','formations','sessions','apprenants','reporting','users') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','contacts','devis') THEN true ELSE false END)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

    -- Commercial : leads, clients, contacts, devis, apporteurs
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'commercial', m,
      CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis','formations','sessions') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','contacts','devis') THEN true ELSE false END)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

    -- Apporteur d'Affaires : leads + lecture catalogue
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'apporteur_affaires', m,
      CASE WHEN m IN ('leads') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','formations','sessions','apporteurs') THEN true ELSE false END,
      CASE WHEN m IN ('leads') THEN true ELSE false END,
      false)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

    -- Formateur
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'formateur', m,
      CASE WHEN m IN ('qcm','evaluations') THEN true ELSE false END,
      CASE WHEN m IN ('sessions','qcm','evaluations','apprenants','formations') THEN true ELSE false END,
      CASE WHEN m IN ('sessions','qcm','evaluations') THEN true ELSE false END,
      false)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

    -- Apprenant
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'apprenant', m,
      CASE WHEN m IN ('evaluations','reclamations') THEN true ELSE false END,
      CASE WHEN m IN ('formations','sessions','qcm','evaluations','documents') THEN true ELSE false END,
      false,
      false)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
