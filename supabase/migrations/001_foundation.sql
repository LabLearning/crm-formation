-- ============================================================
-- MODULE 1 : SOCLE TECHNIQUE — Auth, Organisations, Rôles, Audit
-- CRM Organisme de Formation (Qualiopi)
-- ============================================================

-- Extension pour générer des UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'gestionnaire',
  'commercial',
  'comptable',
  'formateur',
  'apprenant'
);

CREATE TYPE user_status AS ENUM (
  'active',
  'inactive',
  'invited',
  'suspended'
);

-- ============================================================
-- TABLE : organizations
-- ============================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  legal_name TEXT, -- Raison sociale
  siret TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'France',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  numero_da TEXT, -- Numéro de Déclaration d'Activité
  is_qualiopi BOOLEAN DEFAULT false,
  qualiopi_certificate_date DATE,
  primary_color TEXT DEFAULT '#1E40AF',
  secondary_color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : users (profils liés à auth.users)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'gestionnaire',
  status user_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- TABLE : permissions (granulaires par rôle)
-- ============================================================

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  module TEXT NOT NULL, -- ex: 'leads', 'clients', 'formations', 'factures'
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, role, module)
);

CREATE INDEX idx_permissions_org_role ON permissions(organization_id, role);

-- ============================================================
-- TABLE : audit_logs (traçabilité complète)
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- ex: 'create', 'update', 'delete', 'login', 'export'
  entity_type TEXT NOT NULL, -- ex: 'user', 'lead', 'formation', 'facture'
  entity_id UUID,
  details JSONB, -- données avant/après modification
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- TABLE : invitations
-- ============================================================

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'gestionnaire',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);

-- ============================================================
-- FUNCTION : mise à jour automatique de updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION : créer le profil user après inscription
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  user_first_name TEXT;
  user_last_name TEXT;
  user_role_val user_role;
  invitation_record RECORD;
BEGIN
  -- Vérifier s'il y a une invitation en attente
  SELECT * INTO invitation_record
  FROM invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF invitation_record IS NOT NULL THEN
    -- Utilisateur invité : rejoindre l'organisation existante
    org_id := invitation_record.organization_id;
    user_role_val := invitation_record.role;

    -- Marquer l'invitation comme acceptée
    UPDATE invitations SET accepted_at = NOW() WHERE id = invitation_record.id;
  ELSE
    -- Nouvel utilisateur : créer une nouvelle organisation
    INSERT INTO organizations (name, email)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Mon Organisme'),
      NEW.email
    )
    RETURNING id INTO org_id;

    user_role_val := 'super_admin';
  END IF;

  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  -- Créer le profil utilisateur
  INSERT INTO users (id, organization_id, email, first_name, last_name, role, status)
  VALUES (NEW.id, org_id, NEW.email, user_first_name, user_last_name, user_role_val, 'active');

  -- Si super_admin, insérer les permissions par défaut pour tous les rôles
  IF user_role_val = 'super_admin' THEN
    PERFORM seed_default_permissions(org_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur la création d'un utilisateur auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION : permissions par défaut
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

    -- Commercial : leads, clients, contacts, devis, apporteurs
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'commercial', m,
      CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis','formations','sessions') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','contacts','apporteurs','devis') THEN true ELSE false END,
      CASE WHEN m IN ('leads','clients','contacts','devis') THEN true ELSE false END)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

    -- Comptable : factures, paiements, devis (lecture), reporting
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'comptable', m,
      CASE WHEN m IN ('factures','paiements') THEN true ELSE false END,
      CASE WHEN m IN ('factures','paiements','devis','clients','reporting') THEN true ELSE false END,
      CASE WHEN m IN ('factures','paiements') THEN true ELSE false END,
      false)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

    -- Formateur : sessions, qcm, evaluations, apprenants (lecture)
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'formateur', m,
      CASE WHEN m IN ('qcm','evaluations') THEN true ELSE false END,
      CASE WHEN m IN ('sessions','qcm','evaluations','apprenants','formations') THEN true ELSE false END,
      CASE WHEN m IN ('sessions','qcm','evaluations') THEN true ELSE false END,
      false)
    ON CONFLICT (organization_id, role, module) DO NOTHING;

    -- Apprenant : lecture seule sur ses propres données
    INSERT INTO permissions (organization_id, role, module, can_create, can_read, can_update, can_delete)
    VALUES (org_id, 'apprenant', m,
      CASE WHEN m IN ('evaluations','reclamations') THEN true ELSE false END,
      CASE WHEN m IN ('formations','sessions','qcm','evaluations','documents') THEN true ELSE false END,
      false,
      false)
    ON CONFLICT (organization_id, role, module) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Organizations : un user ne voit que sa propre organisation
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Super admin can update own organization"
  ON organizations FOR UPDATE
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- Users : un user ne voit que les membres de son organisation
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admin can manage users"
  ON users FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'gestionnaire')
  ));

-- Permissions : visibles par les membres de l'organisation
CREATE POLICY "Users can view org permissions"
  ON permissions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admin can manage permissions"
  ON permissions FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Audit logs : visibles par admin
CREATE POLICY "Admin can view audit logs"
  ON audit_logs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'gestionnaire')
  ));

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Invitations
CREATE POLICY "Admin can manage invitations"
  ON invitations FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'gestionnaire')
  ));

CREATE POLICY "Anyone can view invitation by token"
  ON invitations FOR SELECT
  USING (true);
