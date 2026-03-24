-- ============================================================
-- FormaCRM — Migration complète
-- Généré automatiquement — Ne pas modifier
-- ============================================================
-- Exécutez ce fichier dans Supabase Dashboard > SQL Editor
-- en une seule fois.
-- ============================================================


-- ============================================================
-- MIGRATION: 001_foundation.sql
-- ============================================================

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


-- ============================================================
-- MIGRATION: 002_crm_commercial.sql
-- ============================================================

-- ============================================================
-- MODULE 2 : CRM COMMERCIAL — Leads, Clients, Contacts, Apporteurs
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE lead_status AS ENUM (
  'nouveau',
  'contacte',
  'qualification',
  'proposition_envoyee',
  'negociation',
  'gagne',
  'perdu'
);

CREATE TYPE lead_source AS ENUM (
  'site_web',
  'apporteur_affaires',
  'phoning',
  'salon',
  'bouche_a_oreille',
  'reseaux_sociaux',
  'email_entrant',
  'partenaire',
  'ancien_client',
  'autre'
);

CREATE TYPE client_type AS ENUM (
  'entreprise',
  'particulier'
);

CREATE TYPE financeur_type AS ENUM (
  'opco',
  'entreprise',
  'france_travail',
  'cpf',
  'fonds_propres',
  'region',
  'autre'
);

CREATE TYPE interaction_type AS ENUM (
  'appel',
  'email',
  'rdv',
  'note',
  'relance',
  'autre'
);

-- ============================================================
-- TABLE : clients
-- ============================================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type client_type NOT NULL DEFAULT 'entreprise',
  -- Entreprise
  raison_sociale TEXT,
  siret TEXT,
  code_naf TEXT,
  secteur_activite TEXT,
  taille_entreprise TEXT, -- TPE, PME, ETI, GE
  -- Commun
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'France',
  telephone TEXT,
  email TEXT,
  site_web TEXT,
  -- Financeur
  financeur_type financeur_type,
  numero_opco TEXT,
  -- Particulier
  civilite TEXT,
  nom TEXT,
  prenom TEXT,
  date_naissance DATE,
  -- Métadonnées
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  score INTEGER DEFAULT 0, -- Scoring personnalisé
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_clients_type ON clients(organization_id, type);
CREATE INDEX idx_clients_raison_sociale ON clients(raison_sociale);
CREATE INDEX idx_clients_tags ON clients USING GIN(tags);

CREATE TRIGGER tr_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : contacts (personnes rattachées à un client)
-- ============================================================

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  civilite TEXT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  mobile TEXT,
  poste TEXT, -- Fonction dans l'entreprise
  service TEXT, -- Département
  est_principal BOOLEAN DEFAULT false, -- Contact principal du client
  est_signataire BOOLEAN DEFAULT false, -- Peut signer des conventions
  est_referent_formation BOOLEAN DEFAULT false,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_client ON contacts(client_id);
CREATE INDEX idx_contacts_email ON contacts(email);

CREATE TRIGGER tr_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : leads
-- ============================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Identité
  entreprise TEXT,
  siret TEXT,
  contact_nom TEXT NOT NULL,
  contact_prenom TEXT,
  contact_email TEXT,
  contact_telephone TEXT,
  contact_poste TEXT,
  -- Qualification
  source lead_source NOT NULL DEFAULT 'autre',
  status lead_status NOT NULL DEFAULT 'nouveau',
  score INTEGER DEFAULT 0,
  montant_estime DECIMAL(12,2), -- Montant potentiel
  -- Besoin
  formation_souhaitee TEXT,
  nombre_stagiaires INTEGER,
  date_souhaitee DATE,
  commentaire TEXT,
  -- Suivi
  apporteur_id UUID REFERENCES apporteurs_affaires(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Conversion
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  -- Meta
  tags TEXT[] DEFAULT '{}',
  next_action TEXT,
  next_action_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_status ON leads(organization_id, status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_source ON leads(organization_id, source);
CREATE INDEX idx_leads_apporteur ON leads(apporteur_id);

CREATE TRIGGER tr_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : lead_interactions (historique des échanges)
-- ============================================================

CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type interaction_type NOT NULL DEFAULT 'note',
  subject TEXT,
  content TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  duration_minutes INTEGER, -- Durée de l'appel/rdv
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_interactions_lead ON lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_date ON lead_interactions(lead_id, date DESC);

-- ============================================================
-- TABLE : apporteurs_affaires
-- ============================================================

CREATE TABLE apporteurs_affaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Identité
  type client_type NOT NULL DEFAULT 'entreprise',
  raison_sociale TEXT,
  siret TEXT,
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  -- Conditions
  taux_commission DECIMAL(5,2) DEFAULT 10.00, -- % de commission
  commission_fixe DECIMAL(12,2), -- ou montant fixe
  mode_calcul TEXT DEFAULT 'pourcentage', -- 'pourcentage' ou 'fixe'
  conditions TEXT, -- Détails contractuels
  -- Statut
  is_active BOOLEAN DEFAULT true,
  date_debut_contrat DATE,
  date_fin_contrat DATE,
  -- Méta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_apporteurs_org ON apporteurs_affaires(organization_id);

CREATE TRIGGER tr_apporteurs_updated_at
  BEFORE UPDATE ON apporteurs_affaires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : commissions
-- ============================================================

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  apporteur_id UUID NOT NULL REFERENCES apporteurs_affaires(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  -- Montants
  montant_base DECIMAL(12,2) NOT NULL, -- Montant de la vente
  taux_applique DECIMAL(5,2),
  montant_commission DECIMAL(12,2) NOT NULL,
  -- Statut
  status TEXT NOT NULL DEFAULT 'en_attente', -- en_attente, validee, payee
  date_validation TIMESTAMPTZ,
  date_paiement TIMESTAMPTZ,
  reference_paiement TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_apporteur ON commissions(apporteur_id);
CREATE INDEX idx_commissions_status ON commissions(organization_id, status);

CREATE TRIGGER tr_commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : relances_programmees
-- ============================================================

CREATE TABLE relances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'lead', 'devis', 'facture', 'signature'
  entity_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'email', -- 'email', 'appel', 'sms'
  date_prevue TIMESTAMPTZ NOT NULL,
  date_executee TIMESTAMPTZ,
  message TEXT,
  is_auto BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_relances_entity ON relances(entity_type, entity_id);
CREATE INDEX idx_relances_date ON relances(date_prevue) WHERE date_executee IS NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE apporteurs_affaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relances ENABLE ROW LEVEL SECURITY;

-- Macro : les users ne voient que les données de leur org
CREATE POLICY "org_isolation_clients" ON clients
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_contacts" ON contacts
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_leads" ON leads
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_lead_interactions" ON lead_interactions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_apporteurs" ON apporteurs_affaires
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_commissions" ON commissions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_relances" ON relances
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));


-- ============================================================
-- MIGRATION: 003_formations_sessions.sql
-- ============================================================

-- ============================================================
-- MODULE 3 : FORMATIONS — Catalogue, Sessions, Inscriptions, Émargement
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE modalite_formation AS ENUM (
  'presentiel',
  'distanciel',
  'mixte'
);

CREATE TYPE session_status AS ENUM (
  'planifiee',
  'confirmee',
  'en_cours',
  'terminee',
  'annulee'
);

CREATE TYPE inscription_status AS ENUM (
  'pre_inscrit',
  'inscrit',
  'confirme',
  'en_cours',
  'complete',
  'abandonne',
  'annule'
);

-- ============================================================
-- TABLE : formations (catalogue)
-- ============================================================

CREATE TABLE formations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Identification
  reference TEXT, -- Code interne (ex: FOR-2024-001)
  intitule TEXT NOT NULL,
  sous_titre TEXT,
  categorie TEXT,
  -- Programme (Qualiopi C2)
  objectifs_pedagogiques TEXT[], -- Liste des objectifs
  prerequis TEXT,
  public_vise TEXT,
  programme_detaille TEXT, -- Contenu en markdown/texte riche
  competences_visees TEXT[], -- Blocs de compétences
  -- Modalités
  modalite modalite_formation NOT NULL DEFAULT 'presentiel',
  duree_heures DECIMAL(8,2) NOT NULL, -- Durée totale en heures
  duree_jours DECIMAL(5,1), -- Durée en jours
  nombre_sessions_prevu INTEGER DEFAULT 1,
  -- Pédagogie (Qualiopi C4)
  methodes_pedagogiques TEXT, -- ex: Apports théoriques, études de cas, mises en situation
  moyens_techniques TEXT, -- ex: Salle équipée, vidéoprojecteur, supports numériques
  modalites_evaluation TEXT, -- ex: QCM, mise en situation, étude de cas
  -- Accessibilité (Qualiopi C6, Indicateur 26)
  accessibilite_handicap TEXT,
  referent_handicap TEXT,
  -- Tarification
  tarif_inter_ht DECIMAL(12,2), -- Prix par stagiaire (inter-entreprise)
  tarif_intra_ht DECIMAL(12,2), -- Prix pour un groupe (intra-entreprise)
  tarif_individuel_ht DECIMAL(12,2),
  tva_applicable BOOLEAN DEFAULT true,
  taux_tva DECIMAL(4,2) DEFAULT 20.00,
  -- Indicateurs de résultat (Qualiopi C1, Indicateur 2)
  taux_satisfaction DECIMAL(5,2), -- % satisfaction
  taux_reussite DECIMAL(5,2), -- % réussite aux évaluations
  taux_insertion DECIMAL(5,2), -- % insertion professionnelle
  nombre_apprenants_total INTEGER DEFAULT 0,
  -- Versioning (Qualiopi C2, traçabilité)
  version INTEGER DEFAULT 1,
  date_derniere_maj DATE DEFAULT CURRENT_DATE,
  historique_versions JSONB DEFAULT '[]'::jsonb,
  -- Certification
  est_certifiante BOOLEAN DEFAULT false,
  code_rncp TEXT,
  code_rs TEXT,
  certificateur TEXT,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false, -- Visible dans le catalogue public
  -- Meta
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_formations_org ON formations(organization_id);
CREATE INDEX idx_formations_active ON formations(organization_id, is_active);
CREATE INDEX idx_formations_ref ON formations(organization_id, reference);
CREATE INDEX idx_formations_tags ON formations USING GIN(tags);

CREATE TRIGGER tr_formations_updated_at
  BEFORE UPDATE ON formations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : formateurs
-- ============================================================

CREATE TABLE formateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Lien optionnel avec un compte user
  -- Identité
  civilite TEXT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  -- Qualifications (Qualiopi C5, Indicateur 21)
  cv_url TEXT, -- Fichier CV dans Supabase Storage
  qualifications TEXT, -- Diplômes, certifications
  domaines_expertise TEXT[], -- Ex: ['Management', 'Bureautique', 'Sécurité']
  certifications TEXT[], -- Ex: ['PMP', 'ITIL', 'PSM']
  -- Habilitations
  date_derniere_habilitation DATE,
  prochaine_mise_a_jour DATE,
  historique_habilitations JSONB DEFAULT '[]'::jsonb,
  -- Contrat
  type_contrat TEXT DEFAULT 'prestataire', -- 'salarie', 'prestataire', 'benevole'
  siret TEXT, -- Si prestataire
  tarif_journalier DECIMAL(10,2),
  tarif_horaire DECIMAL(10,2),
  -- Évaluation
  note_moyenne DECIMAL(3,2), -- Sur 5
  nombre_evaluations INTEGER DEFAULT 0,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_formateurs_org ON formateurs(organization_id);
CREATE INDEX idx_formateurs_expertise ON formateurs USING GIN(domaines_expertise);

CREATE TRIGGER tr_formateurs_updated_at
  BEFORE UPDATE ON formateurs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : apprenants
-- ============================================================

CREATE TABLE apprenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- Entreprise rattachée
  -- Identité
  civilite TEXT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  date_naissance DATE,
  -- Professionnel
  entreprise TEXT,
  poste TEXT,
  -- Handicap (Qualiopi C6, Indicateur 26)
  situation_handicap BOOLEAN DEFAULT false,
  type_handicap TEXT,
  besoins_adaptation TEXT,
  referent_handicap_contacte BOOLEAN DEFAULT false,
  -- Meta
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_apprenants_org ON apprenants(organization_id);
CREATE INDEX idx_apprenants_client ON apprenants(client_id);
CREATE INDEX idx_apprenants_email ON apprenants(email);

CREATE TRIGGER tr_apprenants_updated_at
  BEFORE UPDATE ON apprenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : sessions
-- ============================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  -- Identification
  reference TEXT, -- Ex: SES-2024-001
  intitule TEXT, -- Peut surcharger le nom de la formation
  -- Planning
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  horaires TEXT, -- Ex: "09:00 - 12:30 / 14:00 - 17:30"
  -- Lieu
  lieu TEXT, -- Nom du lieu ou "Distanciel"
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  lien_visio TEXT, -- Lien Zoom/Teams/Meet
  -- Capacité
  places_min INTEGER DEFAULT 1,
  places_max INTEGER DEFAULT 12,
  -- Formateur
  formateur_id UUID REFERENCES formateurs(id) ON DELETE SET NULL,
  -- Statut
  status session_status NOT NULL DEFAULT 'planifiee',
  -- Financier
  cout_formateur DECIMAL(12,2),
  cout_salle DECIMAL(12,2),
  cout_materiel DECIMAL(12,2),
  -- Notes
  notes_internes TEXT,
  notes_logistiques TEXT,
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_org ON sessions(organization_id);
CREATE INDEX idx_sessions_formation ON sessions(formation_id);
CREATE INDEX idx_sessions_dates ON sessions(date_debut, date_fin);
CREATE INDEX idx_sessions_formateur ON sessions(formateur_id);
CREATE INDEX idx_sessions_status ON sessions(organization_id, status);

CREATE TRIGGER tr_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : inscriptions (apprenant ↔ session)
-- ============================================================

CREATE TABLE inscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  apprenant_id UUID NOT NULL REFERENCES apprenants(id) ON DELETE CASCADE,
  -- Statut
  status inscription_status NOT NULL DEFAULT 'pre_inscrit',
  date_inscription TIMESTAMPTZ DEFAULT NOW(),
  date_confirmation TIMESTAMPTZ,
  date_annulation TIMESTAMPTZ,
  motif_annulation TEXT,
  -- Financement
  financeur_type financeur_type,
  financeur_nom TEXT, -- Nom de l'OPCO ou financeur
  montant_pris_en_charge DECIMAL(12,2),
  numero_prise_en_charge TEXT,
  -- Présence
  heures_presence DECIMAL(8,2) DEFAULT 0,
  taux_assiduite DECIMAL(5,2) DEFAULT 0,
  -- Résultats
  note_evaluation_entree DECIMAL(5,2),
  note_evaluation_sortie DECIMAL(5,2),
  progression DECIMAL(5,2), -- % de progression
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, apprenant_id)
);

CREATE INDEX idx_inscriptions_session ON inscriptions(session_id);
CREATE INDEX idx_inscriptions_apprenant ON inscriptions(apprenant_id);
CREATE INDEX idx_inscriptions_status ON inscriptions(organization_id, status);

CREATE TRIGGER tr_inscriptions_updated_at
  BEFORE UPDATE ON inscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : emargements (feuilles de présence)
-- ============================================================

CREATE TABLE emargements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  apprenant_id UUID NOT NULL REFERENCES apprenants(id) ON DELETE CASCADE,
  -- Créneau
  date DATE NOT NULL,
  creneau TEXT NOT NULL DEFAULT 'matin', -- 'matin', 'apres_midi', 'journee'
  heure_debut TIME,
  heure_fin TIME,
  -- Signature
  est_present BOOLEAN DEFAULT false,
  signature_data TEXT, -- Base64 de la signature ou hash
  signed_at TIMESTAMPTZ,
  ip_address INET,
  -- QR Code / validation
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, apprenant_id, date, creneau)
);

CREATE INDEX idx_emargements_session ON emargements(session_id);
CREATE INDEX idx_emargements_date ON emargements(session_id, date);
CREATE INDEX idx_emargements_apprenant ON emargements(apprenant_id);
CREATE INDEX idx_emargements_token ON emargements(token);

-- ============================================================
-- TABLE : formation_formateurs (many-to-many)
-- ============================================================

CREATE TABLE formation_formateurs (
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  formateur_id UUID NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  est_referent BOOLEAN DEFAULT false,
  PRIMARY KEY (formation_id, formateur_id)
);

-- ============================================================
-- VIEW : sessions avec stats inscriptions
-- ============================================================

CREATE OR REPLACE VIEW sessions_avec_stats AS
SELECT
  s.*,
  f.intitule AS formation_intitule,
  f.duree_heures AS formation_duree_heures,
  f.modalite AS formation_modalite,
  fm.prenom AS formateur_prenom,
  fm.nom AS formateur_nom,
  COUNT(i.id) FILTER (WHERE i.status NOT IN ('annule', 'abandonne')) AS nb_inscrits,
  COUNT(i.id) FILTER (WHERE i.status = 'complete') AS nb_completes,
  s.places_max - COUNT(i.id) FILTER (WHERE i.status NOT IN ('annule', 'abandonne')) AS places_restantes
FROM sessions s
LEFT JOIN formations f ON s.formation_id = f.id
LEFT JOIN formateurs fm ON s.formateur_id = fm.id
LEFT JOIN inscriptions i ON s.id = i.session_id
GROUP BY s.id, f.intitule, f.duree_heures, f.modalite, fm.prenom, fm.nom;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE formateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE apprenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emargements ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_formateurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_formations" ON formations
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_formateurs" ON formateurs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_apprenants" ON apprenants
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_sessions" ON sessions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_inscriptions" ON inscriptions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_emargements" ON emargements
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- formation_formateurs via formation
CREATE POLICY "org_isolation_formation_formateurs" ON formation_formateurs
  FOR ALL USING (formation_id IN (
    SELECT id FROM formations WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));


-- ============================================================
-- MIGRATION: 004_devis_conventions_dossiers.sql
-- ============================================================

-- ============================================================
-- MODULE 5 : DEVIS, CONVENTIONS, DOSSIERS DE FORMATION
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE devis_status AS ENUM (
  'brouillon',
  'envoye',
  'accepte',
  'refuse',
  'expire'
);

CREATE TYPE convention_status AS ENUM (
  'brouillon',
  'envoyee',
  'signee_client',
  'signee_of',
  'signee_complete',
  'annulee'
);

CREATE TYPE dossier_status AS ENUM (
  'en_creation',
  'devis_envoye',
  'convention_signee',
  'en_cours',
  'realise',
  'facture',
  'cloture'
);

CREATE TYPE convention_type AS ENUM (
  'inter_entreprise',
  'intra_entreprise',
  'individuelle'
);

-- ============================================================
-- TABLE : devis
-- ============================================================

CREATE TABLE devis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation
  numero TEXT NOT NULL, -- DEV-2024-001
  -- Relations
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  dossier_id UUID REFERENCES dossiers_formation(id) ON DELETE SET NULL,
  -- Statut
  status devis_status NOT NULL DEFAULT 'brouillon',
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_validite DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  date_acceptation DATE,
  date_refus DATE,
  motif_refus TEXT,
  -- Montants
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  taux_tva DECIMAL(4,2) DEFAULT 20.00,
  montant_tva DECIMAL(12,2) DEFAULT 0,
  montant_ttc DECIMAL(12,2) DEFAULT 0,
  remise_pourcent DECIMAL(5,2) DEFAULT 0,
  remise_montant DECIMAL(12,2) DEFAULT 0,
  -- Contenu
  objet TEXT,
  conditions_particulieres TEXT,
  notes_internes TEXT,
  -- Suivi
  sent_at TIMESTAMPTZ,
  sent_to TEXT, -- Email destinataire
  relance_count INTEGER DEFAULT 0,
  last_relance_at TIMESTAMPTZ,
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devis_org ON devis(organization_id);
CREATE INDEX idx_devis_client ON devis(client_id);
CREATE INDEX idx_devis_status ON devis(organization_id, status);
CREATE INDEX idx_devis_numero ON devis(organization_id, numero);

CREATE TRIGGER tr_devis_updated_at
  BEFORE UPDATE ON devis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : devis_lignes
-- ============================================================

CREATE TABLE devis_lignes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  devis_id UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  -- Contenu
  designation TEXT NOT NULL,
  description TEXT,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  -- Quantité & prix
  quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
  unite TEXT DEFAULT 'forfait', -- forfait, heure, jour, personne
  prix_unitaire_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Ordre
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devis_lignes_devis ON devis_lignes(devis_id);

-- ============================================================
-- TABLE : dossiers_formation (dossier complet)
-- ============================================================

CREATE TABLE dossiers_formation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation
  numero TEXT NOT NULL, -- DOS-2024-001
  -- Relations
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Statut
  status dossier_status NOT NULL DEFAULT 'en_creation',
  -- Financement
  financeur_type financeur_type,
  financeur_nom TEXT,
  numero_prise_en_charge TEXT,
  montant_prise_en_charge DECIMAL(12,2),
  date_accord_financement DATE,
  -- Montants
  montant_total_ht DECIMAL(12,2) DEFAULT 0,
  montant_total_ttc DECIMAL(12,2) DEFAULT 0,
  -- Dates clés
  date_creation DATE DEFAULT CURRENT_DATE,
  date_devis DATE,
  date_convention DATE,
  date_debut_formation DATE,
  date_fin_formation DATE,
  date_facturation DATE,
  date_cloture DATE,
  -- Suivi
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dossiers_org ON dossiers_formation(organization_id);
CREATE INDEX idx_dossiers_client ON dossiers_formation(client_id);
CREATE INDEX idx_dossiers_status ON dossiers_formation(organization_id, status);

CREATE TRIGGER tr_dossiers_updated_at
  BEFORE UPDATE ON dossiers_formation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : conventions
-- ============================================================

CREATE TABLE conventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation
  numero TEXT NOT NULL, -- CONV-2024-001
  type convention_type NOT NULL DEFAULT 'inter_entreprise',
  -- Relations
  dossier_id UUID REFERENCES dossiers_formation(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  -- Statut
  status convention_status NOT NULL DEFAULT 'brouillon',
  -- Contenu
  objet TEXT,
  nombre_stagiaires INTEGER DEFAULT 1,
  duree_heures DECIMAL(8,2),
  lieu TEXT,
  dates_formation TEXT, -- Texte libre pour les dates
  -- Montants
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  taux_tva DECIMAL(4,2) DEFAULT 20.00,
  montant_ttc DECIMAL(12,2) DEFAULT 0,
  -- Financement
  financeur_type financeur_type,
  financeur_nom TEXT,
  numero_prise_en_charge TEXT,
  -- Signatures
  signature_client_date TIMESTAMPTZ,
  signature_client_nom TEXT,
  signature_of_date TIMESTAMPTZ,
  signature_of_nom TEXT,
  -- Dates
  date_emission DATE DEFAULT CURRENT_DATE,
  sent_at TIMESTAMPTZ,
  -- Meta
  notes_internes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conventions_org ON conventions(organization_id);
CREATE INDEX idx_conventions_dossier ON conventions(dossier_id);
CREATE INDEX idx_conventions_status ON conventions(organization_id, status);

CREATE TRIGGER tr_conventions_updated_at
  BEFORE UPDATE ON conventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : dossier_checklist (complétude documentaire)
-- ============================================================

CREATE TABLE dossier_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES dossiers_formation(id) ON DELETE CASCADE,
  -- Item
  label TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'administratif', -- administratif, pedagogique, financier
  is_required BOOLEAN DEFAULT true,
  -- Statut
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  document_url TEXT, -- Lien vers le document dans Storage
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dossier_checklist ON dossier_checklist(dossier_id);

-- ============================================================
-- TABLE : dossier_timeline (historique du dossier)
-- ============================================================

CREATE TABLE dossier_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES dossiers_formation(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- ex: 'devis_cree', 'convention_signee', 'formation_demarree'
  description TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dossier_timeline ON dossier_timeline(dossier_id, created_at DESC);

-- ============================================================
-- FUNCTION : auto-populate checklist on dossier creation
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dossier_checklist (dossier_id, label, categorie, is_required) VALUES
    (NEW.id, 'Devis envoyé et accepté', 'administratif', true),
    (NEW.id, 'Convention de formation signée', 'administratif', true),
    (NEW.id, 'Convocation envoyée aux stagiaires', 'administratif', true),
    (NEW.id, 'Programme de formation transmis', 'pedagogique', true),
    (NEW.id, 'Règlement intérieur transmis', 'administratif', true),
    (NEW.id, 'Test de positionnement réalisé', 'pedagogique', false),
    (NEW.id, 'Feuilles d''émargement signées', 'administratif', true),
    (NEW.id, 'Évaluation des acquis réalisée', 'pedagogique', true),
    (NEW.id, 'Questionnaire de satisfaction envoyé', 'pedagogique', true),
    (NEW.id, 'Attestation de fin de formation émise', 'administratif', true),
    (NEW.id, 'Certificat de réalisation émis', 'administratif', true),
    (NEW.id, 'Facture émise', 'financier', true),
    (NEW.id, 'Paiement reçu', 'financier', true),
    (NEW.id, 'Accord de prise en charge OPCO', 'financier', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_dossier_checklist
  AFTER INSERT ON dossiers_formation
  FOR EACH ROW EXECUTE FUNCTION create_default_checklist();

-- ============================================================
-- FUNCTION : auto-generate devis numero
-- ============================================================

CREATE OR REPLACE FUNCTION generate_devis_numero()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    SELECT COUNT(*) + 1 INTO seq_num
    FROM devis
    WHERE organization_id = NEW.organization_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.numero := 'DEV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_devis_numero
  BEFORE INSERT ON devis
  FOR EACH ROW EXECUTE FUNCTION generate_devis_numero();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers_formation ENABLE ROW LEVEL SECURITY;
ALTER TABLE conventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_devis" ON devis
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_devis_lignes" ON devis_lignes
  FOR ALL USING (devis_id IN (SELECT id FROM devis WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_dossiers" ON dossiers_formation
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_conventions" ON conventions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_dossier_checklist" ON dossier_checklist
  FOR ALL USING (dossier_id IN (SELECT id FROM dossiers_formation WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_dossier_timeline" ON dossier_timeline
  FOR ALL USING (dossier_id IN (SELECT id FROM dossiers_formation WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));


-- ============================================================
-- MIGRATION: 005_facturation_paiements.sql
-- ============================================================

-- ============================================================
-- MODULE 6 : FACTURATION & PAIEMENTS
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE facture_type AS ENUM (
  'facture',
  'acompte',
  'solde',
  'avoir'
);

CREATE TYPE facture_status AS ENUM (
  'brouillon',
  'emise',
  'envoyee',
  'payee_partiellement',
  'payee',
  'en_retard',
  'annulee'
);

CREATE TYPE paiement_mode AS ENUM (
  'virement',
  'cb',
  'cheque',
  'prelevement',
  'especes',
  'stripe',
  'opco',
  'cpf',
  'autre'
);

CREATE TYPE paiement_status AS ENUM (
  'en_attente',
  'valide',
  'refuse',
  'rembourse'
);

-- ============================================================
-- TABLE : factures
-- ============================================================

CREATE TABLE factures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation (séquentielle, obligatoire légalement)
  numero TEXT NOT NULL UNIQUE,
  type facture_type NOT NULL DEFAULT 'facture',
  -- Relations
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  convention_id UUID REFERENCES conventions(id) ON DELETE SET NULL,
  dossier_id UUID REFERENCES dossiers_formation(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Avoir lié
  facture_origine_id UUID REFERENCES factures(id) ON DELETE SET NULL, -- Si avoir, référence la facture d'origine
  -- Statut
  status facture_status NOT NULL DEFAULT 'brouillon',
  -- Dates
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  date_envoi TIMESTAMPTZ,
  date_paiement_complet DATE,
  -- Montants
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  taux_tva DECIMAL(4,2) DEFAULT 20.00,
  montant_tva DECIMAL(12,2) DEFAULT 0,
  montant_ttc DECIMAL(12,2) DEFAULT 0,
  montant_paye DECIMAL(12,2) DEFAULT 0,
  montant_restant DECIMAL(12,2) DEFAULT 0,
  -- Remise
  remise_pourcent DECIMAL(5,2) DEFAULT 0,
  remise_montant DECIMAL(12,2) DEFAULT 0,
  -- Contenu
  objet TEXT,
  conditions_paiement TEXT DEFAULT 'Paiement à 30 jours',
  mentions_legales TEXT,
  notes_internes TEXT,
  -- Financement
  financeur_type financeur_type,
  financeur_nom TEXT,
  numero_prise_en_charge TEXT,
  subrogation BOOLEAN DEFAULT false, -- Paiement direct par le financeur
  -- Relances
  relance_count INTEGER DEFAULT 0,
  derniere_relance_at TIMESTAMPTZ,
  prochaine_relance_at TIMESTAMPTZ,
  -- Stripe
  stripe_invoice_id TEXT,
  stripe_payment_url TEXT,
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_factures_org ON factures(organization_id);
CREATE INDEX idx_factures_client ON factures(client_id);
CREATE INDEX idx_factures_status ON factures(organization_id, status);
CREATE INDEX idx_factures_numero ON factures(numero);
CREATE INDEX idx_factures_dossier ON factures(dossier_id);
CREATE INDEX idx_factures_echeance ON factures(date_echeance) WHERE status IN ('emise', 'envoyee', 'payee_partiellement');

CREATE TRIGGER tr_factures_updated_at
  BEFORE UPDATE ON factures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : facture_lignes
-- ============================================================

CREATE TABLE facture_lignes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  description TEXT,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Quantité & prix
  quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
  unite TEXT DEFAULT 'forfait',
  prix_unitaire_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Ordre
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facture_lignes ON facture_lignes(facture_id);

-- ============================================================
-- TABLE : paiements
-- ============================================================

CREATE TABLE paiements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  -- Montant
  montant DECIMAL(12,2) NOT NULL,
  -- Mode
  mode paiement_mode NOT NULL DEFAULT 'virement',
  status paiement_status NOT NULL DEFAULT 'en_attente',
  -- Dates
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  date_validation TIMESTAMPTZ,
  -- Références
  reference TEXT, -- N° de chèque, ref virement, etc.
  stripe_payment_id TEXT,
  stripe_charge_id TEXT,
  -- Payeur
  payeur_nom TEXT, -- Si différent du client (ex: OPCO)
  payeur_type TEXT, -- 'client', 'opco', 'france_travail', 'cpf'
  -- Meta
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_paiements_facture ON paiements(facture_id);
CREATE INDEX idx_paiements_org ON paiements(organization_id);
CREATE INDEX idx_paiements_status ON paiements(organization_id, status);
CREATE INDEX idx_paiements_date ON paiements(date_paiement DESC);

CREATE TRIGGER tr_paiements_updated_at
  BEFORE UPDATE ON paiements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION : auto-generate facture numero
-- ============================================================

CREATE OR REPLACE FUNCTION generate_facture_numero()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
  prefix TEXT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    prefix := CASE NEW.type
      WHEN 'avoir' THEN 'AV'
      WHEN 'acompte' THEN 'FA'
      ELSE 'FA'
    END;
    SELECT COUNT(*) + 1 INTO seq_num
    FROM factures
    WHERE organization_id = NEW.organization_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.numero := prefix || '-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_facture_numero
  BEFORE INSERT ON factures
  FOR EACH ROW EXECUTE FUNCTION generate_facture_numero();

-- ============================================================
-- FUNCTION : update facture amounts on paiement change
-- ============================================================

CREATE OR REPLACE FUNCTION update_facture_paiements()
RETURNS TRIGGER AS $$
DECLARE
  total_paye DECIMAL(12,2);
  fac_ttc DECIMAL(12,2);
  fac_id UUID;
BEGIN
  fac_id := COALESCE(NEW.facture_id, OLD.facture_id);

  SELECT COALESCE(SUM(montant), 0) INTO total_paye
  FROM paiements
  WHERE facture_id = fac_id AND status = 'valide';

  SELECT montant_ttc INTO fac_ttc FROM factures WHERE id = fac_id;

  UPDATE factures SET
    montant_paye = total_paye,
    montant_restant = GREATEST(fac_ttc - total_paye, 0),
    status = CASE
      WHEN total_paye >= fac_ttc THEN 'payee'
      WHEN total_paye > 0 THEN 'payee_partiellement'
      ELSE status
    END,
    date_paiement_complet = CASE WHEN total_paye >= fac_ttc THEN CURRENT_DATE ELSE NULL END
  WHERE id = fac_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_paiement_update_facture
  AFTER INSERT OR UPDATE OR DELETE ON paiements
  FOR EACH ROW EXECUTE FUNCTION update_facture_paiements();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE facture_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_factures" ON factures
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_facture_lignes" ON facture_lignes
  FOR ALL USING (facture_id IN (SELECT id FROM factures WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_paiements" ON paiements
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));


-- ============================================================
-- MIGRATION: 006_qcm_evaluations.sql
-- ============================================================

-- ============================================================
-- MODULE 7 : QCM & ÉVALUATIONS (Qualiopi C5/C7)
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE qcm_type AS ENUM (
  'positionnement',    -- Qualiopi C2 Ind.17
  'entree',            -- Évaluation diagnostique
  'sortie',            -- Qualiopi C5 Ind.18
  'satisfaction_chaud', -- Qualiopi C7 Ind.30
  'satisfaction_froid'  -- Qualiopi C7 Ind.31
);

CREATE TYPE question_type AS ENUM (
  'choix_unique',
  'choix_multiple',
  'vrai_faux',
  'note_1_5',
  'note_1_10',
  'texte_libre',
  'nps'
);

CREATE TYPE evaluation_status AS ENUM (
  'brouillon',
  'publie',
  'en_cours',
  'termine',
  'archive'
);

-- ============================================================
-- TABLE : qcm (banque de questionnaires)
-- ============================================================

CREATE TABLE qcm (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  -- Identification
  titre TEXT NOT NULL,
  description TEXT,
  type qcm_type NOT NULL,
  -- Configuration
  duree_minutes INTEGER, -- Temps limite
  score_min_reussite DECIMAL(5,2), -- % min pour réussir (QCM)
  questions_aleatoires BOOLEAN DEFAULT false,
  afficher_resultats BOOLEAN DEFAULT true, -- Montrer les résultats au participant
  -- Statut
  status evaluation_status NOT NULL DEFAULT 'brouillon',
  is_template BOOLEAN DEFAULT false, -- Modèle réutilisable
  -- Meta
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_org ON qcm(organization_id);
CREATE INDEX idx_qcm_formation ON qcm(formation_id);
CREATE INDEX idx_qcm_type ON qcm(organization_id, type);

CREATE TRIGGER tr_qcm_updated_at
  BEFORE UPDATE ON qcm FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : qcm_questions
-- ============================================================

CREATE TABLE qcm_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qcm_id UUID NOT NULL REFERENCES qcm(id) ON DELETE CASCADE,
  -- Question
  texte TEXT NOT NULL,
  type question_type NOT NULL DEFAULT 'choix_unique',
  explication TEXT, -- Explication affichée après réponse
  points DECIMAL(5,2) DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  -- Ordre
  position INTEGER DEFAULT 0,
  -- Section / regroupement
  section TEXT, -- Ex: "Connaissances générales", "Satisfaction globale"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_questions ON qcm_questions(qcm_id, position);

-- ============================================================
-- TABLE : qcm_choix (options de réponse)
-- ============================================================

CREATE TABLE qcm_choix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES qcm_questions(id) ON DELETE CASCADE,
  texte TEXT NOT NULL,
  est_correct BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_choix ON qcm_choix(question_id, position);

-- ============================================================
-- TABLE : qcm_sessions (instance d'un QCM pour une session)
-- ============================================================

CREATE TABLE qcm_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  qcm_id UUID NOT NULL REFERENCES qcm(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Période
  date_ouverture TIMESTAMPTZ DEFAULT NOW(),
  date_fermeture TIMESTAMPTZ,
  -- Envoi
  envoi_auto BOOLEAN DEFAULT false,
  envoye_at TIMESTAMPTZ,
  -- Rappels (satisfaction)
  rappel_j30 BOOLEAN DEFAULT false,
  rappel_j90 BOOLEAN DEFAULT false,
  date_rappel_j30 TIMESTAMPTZ,
  date_rappel_j90 TIMESTAMPTZ,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_sessions ON qcm_sessions(qcm_id, session_id);

-- ============================================================
-- TABLE : qcm_reponses (résultats d'un apprenant)
-- ============================================================

CREATE TABLE qcm_reponses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  qcm_id UUID NOT NULL REFERENCES qcm(id) ON DELETE CASCADE,
  qcm_session_id UUID REFERENCES qcm_sessions(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  apprenant_id UUID NOT NULL REFERENCES apprenants(id) ON DELETE CASCADE,
  -- Accès
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  -- Résultat
  score DECIMAL(5,2), -- Score obtenu en %
  score_points DECIMAL(8,2), -- Points obtenus
  score_total DECIMAL(8,2), -- Points max possibles
  is_reussi BOOLEAN,
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duree_secondes INTEGER,
  -- Statut
  is_complete BOOLEAN DEFAULT false,
  -- Meta
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qcm_reponses_qcm ON qcm_reponses(qcm_id);
CREATE INDEX idx_qcm_reponses_apprenant ON qcm_reponses(apprenant_id);
CREATE INDEX idx_qcm_reponses_session ON qcm_reponses(session_id);
CREATE INDEX idx_qcm_reponses_token ON qcm_reponses(token);

-- ============================================================
-- TABLE : qcm_reponses_detail (réponses question par question)
-- ============================================================

CREATE TABLE qcm_reponses_detail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reponse_id UUID NOT NULL REFERENCES qcm_reponses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES qcm_questions(id) ON DELETE CASCADE,
  -- Réponse
  choix_ids UUID[], -- IDs des choix sélectionnés
  texte_libre TEXT, -- Pour les questions ouvertes
  note_valeur INTEGER, -- Pour les échelles (1-5, 1-10, NPS)
  -- Évaluation
  est_correct BOOLEAN,
  points_obtenus DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reponses_detail ON qcm_reponses_detail(reponse_id);

-- ============================================================
-- TABLE : evaluations_satisfaction (résultats agrégés)
-- ============================================================

CREATE TABLE evaluations_satisfaction (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  type qcm_type NOT NULL, -- satisfaction_chaud ou satisfaction_froid
  -- Stats agrégées
  nombre_reponses INTEGER DEFAULT 0,
  nombre_invites INTEGER DEFAULT 0,
  taux_reponse DECIMAL(5,2) DEFAULT 0,
  note_moyenne DECIMAL(3,2) DEFAULT 0, -- /5
  nps_score INTEGER, -- -100 à +100
  -- Détail par thème
  note_contenu DECIMAL(3,2),
  note_formateur DECIMAL(3,2),
  note_organisation DECIMAL(3,2),
  note_supports DECIMAL(3,2),
  note_applicabilite DECIMAL(3,2),
  -- Verbatims
  points_forts TEXT[], -- Agrégation des commentaires positifs
  axes_amelioration TEXT[], -- Agrégation des suggestions
  -- Meta
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eval_satisfaction_session ON evaluations_satisfaction(session_id);
CREATE INDEX idx_eval_satisfaction_type ON evaluations_satisfaction(organization_id, type);

CREATE TRIGGER tr_eval_satisfaction_updated_at
  BEFORE UPDATE ON evaluations_satisfaction FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE qcm ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_choix ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_reponses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_reponses_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations_satisfaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_qcm" ON qcm
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_qcm_questions" ON qcm_questions
  FOR ALL USING (qcm_id IN (SELECT id FROM qcm WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_qcm_choix" ON qcm_choix
  FOR ALL USING (question_id IN (SELECT id FROM qcm_questions WHERE qcm_id IN (SELECT id FROM qcm WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))));

CREATE POLICY "org_isolation_qcm_sessions" ON qcm_sessions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_qcm_reponses" ON qcm_reponses
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_qcm_reponses_detail" ON qcm_reponses_detail
  FOR ALL USING (reponse_id IN (SELECT id FROM qcm_reponses WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_eval_satisfaction" ON evaluations_satisfaction
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Public access for token-based QCM responses
CREATE POLICY "public_qcm_by_token" ON qcm_reponses
  FOR SELECT USING (true);


-- ============================================================
-- MIGRATION: 007_qualiopi_reclamations.sql
-- ============================================================

-- ============================================================
-- MODULE 8 : CONFORMITÉ QUALIOPI & RÉCLAMATIONS
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE conformite_niveau AS ENUM (
  'conforme',
  'partiellement_conforme',
  'non_conforme',
  'non_applicable',
  'non_evalue'
);

CREATE TYPE reclamation_status AS ENUM (
  'recue',
  'en_analyse',
  'action_corrective',
  'cloturee'
);

CREATE TYPE reclamation_origine AS ENUM (
  'apprenant',
  'entreprise',
  'financeur',
  'formateur',
  'interne',
  'autre'
);

CREATE TYPE action_status AS ENUM (
  'planifiee',
  'en_cours',
  'realisee',
  'verifiee',
  'abandonnee'
);

CREATE TYPE action_priorite AS ENUM (
  'basse',
  'moyenne',
  'haute',
  'critique'
);

-- ============================================================
-- TABLE : qualiopi_indicateurs (32 indicateurs)
-- ============================================================

CREATE TABLE qualiopi_indicateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Identification
  critere INTEGER NOT NULL, -- 1 à 7
  indicateur INTEGER NOT NULL, -- 1 à 32
  libelle TEXT NOT NULL,
  description TEXT,
  -- Évaluation
  niveau conformite_niveau NOT NULL DEFAULT 'non_evalue',
  commentaire TEXT,
  date_evaluation DATE,
  evalue_par UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Preuve
  preuves_attendues TEXT, -- Description des preuves nécessaires
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, critere, indicateur)
);

CREATE INDEX idx_qualiopi_org ON qualiopi_indicateurs(organization_id);
CREATE INDEX idx_qualiopi_critere ON qualiopi_indicateurs(organization_id, critere);

CREATE TRIGGER tr_qualiopi_updated_at
  BEFORE UPDATE ON qualiopi_indicateurs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : qualiopi_preuves
-- ============================================================

CREATE TABLE qualiopi_preuves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicateur_id UUID NOT NULL REFERENCES qualiopi_indicateurs(id) ON DELETE CASCADE,
  -- Preuve
  titre TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'document', -- document, donnee, processus, lien
  -- Fichier ou lien
  document_url TEXT,
  lien_externe TEXT,
  -- Entité liée (preuve automatique)
  entity_type TEXT, -- 'formation', 'session', 'evaluation', etc.
  entity_id UUID,
  -- Validité
  date_preuve DATE DEFAULT CURRENT_DATE,
  est_valide BOOLEAN DEFAULT true,
  valide_par UUID REFERENCES users(id) ON DELETE SET NULL,
  date_validation TIMESTAMPTZ,
  -- Meta
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_preuves_indicateur ON qualiopi_preuves(indicateur_id);
CREATE INDEX idx_preuves_org ON qualiopi_preuves(organization_id);

-- ============================================================
-- TABLE : reclamations
-- ============================================================

CREATE TABLE reclamations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation
  numero TEXT NOT NULL,
  -- Identification
  objet TEXT NOT NULL,
  description TEXT NOT NULL,
  origine reclamation_origine NOT NULL DEFAULT 'apprenant',
  -- Émetteur
  emetteur_nom TEXT,
  emetteur_email TEXT,
  emetteur_telephone TEXT,
  apprenant_id UUID REFERENCES apprenants(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Statut
  status reclamation_status NOT NULL DEFAULT 'recue',
  priorite action_priorite DEFAULT 'moyenne',
  -- Traitement
  analyse TEXT,
  action_corrective TEXT,
  date_reception DATE DEFAULT CURRENT_DATE,
  date_analyse DATE,
  date_resolution DATE,
  date_cloture DATE,
  -- Assignation
  responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Satisfaction résolution
  resolution_satisfaisante BOOLEAN,
  commentaire_cloture TEXT,
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reclamations_org ON reclamations(organization_id);
CREATE INDEX idx_reclamations_status ON reclamations(organization_id, status);

CREATE TRIGGER tr_reclamations_updated_at
  BEFORE UPDATE ON reclamations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : actions_amelioration
-- ============================================================

CREATE TABLE actions_amelioration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Source
  titre TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'reclamation', -- reclamation, evaluation, audit, veille, interne
  reclamation_id UUID REFERENCES reclamations(id) ON DELETE SET NULL,
  indicateur_id UUID REFERENCES qualiopi_indicateurs(id) ON DELETE SET NULL,
  -- Planification
  status action_status NOT NULL DEFAULT 'planifiee',
  priorite action_priorite DEFAULT 'moyenne',
  responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date_planifiee DATE,
  date_echeance DATE,
  date_realisation DATE,
  date_verification DATE,
  -- Résultat
  resultat TEXT,
  efficacite TEXT, -- Évaluation de l'efficacité
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_actions_org ON actions_amelioration(organization_id);
CREATE INDEX idx_actions_status ON actions_amelioration(organization_id, status);
CREATE INDEX idx_actions_reclamation ON actions_amelioration(reclamation_id);

CREATE TRIGGER tr_actions_updated_at
  BEFORE UPDATE ON actions_amelioration FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION : seed 32 Qualiopi indicators
-- ============================================================

CREATE OR REPLACE FUNCTION seed_qualiopi_indicateurs(org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO qualiopi_indicateurs (organization_id, critere, indicateur, libelle, description, preuves_attendues) VALUES
  -- Critère 1 : Information du public
  (org_id, 1, 1, 'Information sur les prestations', 'Diffusion d''informations détaillées sur les prestations proposées', 'Catalogue, site web, fiches programmes'),
  (org_id, 1, 2, 'Indicateurs de résultats', 'Publication des indicateurs de résultats des prestations', 'Taux de satisfaction, taux de réussite, taux d''insertion'),
  (org_id, 1, 3, 'Obtention des certifications', 'Information sur les certifications et leur obtention', 'Fiches RNCP/RS, taux de certification'),
  -- Critère 2 : Objectifs et adaptation
  (org_id, 2, 4, 'Analyse du besoin', 'Analyse du besoin du bénéficiaire', 'Formulaires de recueil des besoins, comptes-rendus'),
  (org_id, 2, 5, 'Objectifs de la prestation', 'Définition des objectifs opérationnels et évaluables', 'Programmes avec objectifs, conventions'),
  (org_id, 2, 6, 'Contenus et modalités', 'Mise en œuvre et adaptation des contenus', 'Programmes détaillés, supports pédagogiques'),
  (org_id, 2, 7, 'Adéquation contenus/certification', 'Adéquation des contenus aux exigences de certification', 'Référentiels, grilles d''évaluation'),
  (org_id, 2, 8, 'Positionnement à l''entrée', 'Procédures de positionnement et d''évaluation des acquis', 'Tests de positionnement, résultats'),
  -- Critère 3 : Accompagnement
  (org_id, 3, 9, 'Conditions de déroulement', 'Information sur les conditions de déroulement', 'Convocations, livret d''accueil, règlement intérieur'),
  (org_id, 3, 10, 'Adaptation de la prestation', 'Adaptation de la prestation et accompagnement', 'Comptes-rendus, adaptations réalisées'),
  (org_id, 3, 11, 'Atteinte des objectifs', 'Évaluation de l''atteinte des objectifs', 'Résultats QCM, évaluations, attestations'),
  (org_id, 3, 12, 'Engagement des bénéficiaires', 'Engagement et prévention des ruptures', 'Suivi assiduité, relances, entretiens'),
  (org_id, 3, 13, 'Coordination des intervenants', 'Coordination des apprentissages entre intervenants', 'Réunions pédagogiques, plannings'),
  (org_id, 3, 14, 'Exercice de la citoyenneté', 'Information sur les droits et devoirs des stagiaires', 'Règlement intérieur, affichage obligatoire'),
  (org_id, 3, 15, 'Conseil en formation continue', 'Accompagnement socio-professionnel et orientation', 'Entretiens individuels, orientation'),
  (org_id, 3, 16, 'Accessibilité PSH', 'Accessibilité aux personnes en situation de handicap', 'Référent handicap, adaptations, partenariats'),
  -- Critère 4 : Moyens pédagogiques
  (org_id, 4, 17, 'Moyens humains et techniques', 'Adéquation des moyens pédagogiques et techniques', 'CV formateurs, inventaire matériel, locaux'),
  (org_id, 4, 18, 'Coordination des parties prenantes', 'Coordination des différents intervenants', 'Conventions, contrats, réunions'),
  (org_id, 4, 19, 'Ressources pédagogiques', 'Mise à disposition de ressources pédagogiques', 'Supports de cours, bibliothèque, plateforme LMS'),
  (org_id, 4, 20, 'Conditions favorables', 'Conditions de présentation des prestations favorables', 'Locaux, équipements, accessibilité'),
  -- Critère 5 : Qualification des intervenants
  (org_id, 5, 21, 'Compétences des intervenants', 'Qualification et compétences des formateurs', 'CV, diplômes, habilitations, veille'),
  (org_id, 5, 22, 'Développement des compétences', 'Développement professionnel des formateurs', 'Plans de formation, certifications obtenues'),
  -- Critère 6 : Environnement professionnel
  (org_id, 6, 23, 'Veille légale et réglementaire', 'Réalisation d''une veille réglementaire', 'Abonnements, comptes-rendus de veille'),
  (org_id, 6, 24, 'Veille compétences et métiers', 'Veille sur les compétences, métiers et emplois', 'Sources de veille, analyses sectorielles'),
  (org_id, 6, 25, 'Veille technologique et pédagogique', 'Veille sur innovations pédagogiques et technologiques', 'Outils, méthodes, formations suivies'),
  (org_id, 6, 26, 'Mobilisation des expertises', 'Mobilisation de partenaires et réseaux', 'Conventions de partenariat, intervenants externes'),
  (org_id, 6, 27, 'Conformité réglementaire', 'Conformité aux obligations réglementaires', 'N° DA, Qualiopi, RGPD, affichage'),
  -- Critère 7 : Amélioration continue
  (org_id, 7, 28, 'Recueil des appréciations', 'Recueil des appréciations des parties prenantes', 'Questionnaires satisfaction, enquêtes'),
  (org_id, 7, 29, 'Traitement des réclamations', 'Traitement des difficultés et réclamations', 'Registre réclamations, fiches de traitement'),
  (org_id, 7, 30, 'Mesures d''amélioration', 'Mise en œuvre de mesures d''amélioration', 'Plan d''amélioration, actions correctives'),
  (org_id, 7, 31, 'Analyse des causes', 'Analyse des causes des difficultés rencontrées', 'Analyses, bilans, revues de processus'),
  (org_id, 7, 32, 'Mesures d''amélioration continue', 'Mise en œuvre de mesures d''amélioration continue', 'Bilans, plans d''action, indicateurs de suivi')
  ON CONFLICT (organization_id, critere, indicateur) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Auto-seed on new org (update existing trigger would be better, but for simplicity)
-- Call manually: SELECT seed_qualiopi_indicateurs('org-uuid-here');

-- ============================================================
-- FUNCTION : auto-generate reclamation numero
-- ============================================================

CREATE OR REPLACE FUNCTION generate_reclamation_numero()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    SELECT COUNT(*) + 1 INTO seq_num
    FROM reclamations
    WHERE organization_id = NEW.organization_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.numero := 'REC-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reclamation_numero
  BEFORE INSERT ON reclamations
  FOR EACH ROW EXECUTE FUNCTION generate_reclamation_numero();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE qualiopi_indicateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualiopi_preuves ENABLE ROW LEVEL SECURITY;
ALTER TABLE reclamations ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_amelioration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_qualiopi_ind" ON qualiopi_indicateurs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_qualiopi_preuves" ON qualiopi_preuves
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_reclamations" ON reclamations
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_actions" ON actions_amelioration
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));


-- ============================================================
-- MIGRATION: 008_notifications_emails.sql
-- ============================================================

-- ============================================================
-- MODULE 10 : NOTIFICATIONS & EMAILS
-- ============================================================

-- ============================================================
-- TABLE : notifications (internes)
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Contenu
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, danger, action
  -- Lien
  lien_url TEXT,
  lien_label TEXT,
  -- Entité liée
  entity_type TEXT,
  entity_id UUID,
  -- Statut
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_org ON notifications(organization_id);

-- ============================================================
-- TABLE : email_logs
-- ============================================================

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Destinataire
  to_email TEXT NOT NULL,
  to_name TEXT,
  -- Contenu
  subject TEXT NOT NULL,
  template TEXT NOT NULL, -- Nom du template
  variables JSONB, -- Variables injectées
  -- Entité liée
  entity_type TEXT,
  entity_id UUID,
  -- Résultat
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, bounced
  resend_id TEXT, -- ID Resend
  error TEXT,
  -- Dates
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  -- Meta
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_org ON email_logs(organization_id);
CREATE INDEX idx_email_logs_entity ON email_logs(entity_type, entity_id);
CREATE INDEX idx_email_logs_status ON email_logs(organization_id, status);

-- ============================================================
-- TABLE : email_templates
-- ============================================================

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Identification
  slug TEXT NOT NULL, -- ex: devis_envoye, convocation, satisfaction
  nom TEXT NOT NULL,
  description TEXT,
  -- Contenu
  sujet TEXT NOT NULL, -- Sujet avec variables {nom_apprenant}
  corps_html TEXT NOT NULL, -- HTML avec variables
  corps_texte TEXT, -- Version texte
  -- Config
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- Non supprimable
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_email_templates ON email_templates(organization_id, slug);

CREATE TRIGGER tr_email_templates_updated_at
  BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "org_isolation_email_logs" ON email_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_email_templates" ON email_templates
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- FUNCTION : seed default email templates
-- ============================================================

CREATE OR REPLACE FUNCTION seed_email_templates(org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO email_templates (organization_id, slug, nom, description, sujet, corps_html, is_system) VALUES
  (org_id, 'devis_envoye', 'Envoi de devis', 'Envoyé automatiquement lors de l''envoi d''un devis', 'Devis {numero_devis} — {nom_organisme}', '<h2>Bonjour {nom_contact},</h2><p>Veuillez trouver ci-joint le devis <strong>{numero_devis}</strong> d''un montant de <strong>{montant_ttc} € TTC</strong>.</p><p>Ce devis est valable jusqu''au <strong>{date_validite}</strong>.</p><p>N''hésitez pas à nous contacter pour toute question.</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'convention_signature', 'Convention à signer', 'Envoi de convention pour signature', 'Convention de formation {numero_convention} à signer', '<h2>Bonjour {nom_contact},</h2><p>Veuillez trouver ci-joint la convention de formation <strong>{numero_convention}</strong> pour la formation <strong>{nom_formation}</strong>.</p><p>Merci de signer ce document et de nous le retourner.</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'convocation', 'Convocation formation', 'Envoyée aux apprenants avant la session', 'Convocation — {nom_formation} du {date_debut}', '<h2>Bonjour {prenom_apprenant},</h2><p>Nous avons le plaisir de vous confirmer votre inscription à la formation :</p><p><strong>{nom_formation}</strong><br/>Du {date_debut} au {date_fin}<br/>{horaires}<br/>Lieu : {lieu}</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'satisfaction_chaud', 'Questionnaire satisfaction', 'Envoyé en fin de formation', 'Votre avis sur la formation {nom_formation}', '<h2>Bonjour {prenom_apprenant},</h2><p>Vous venez de terminer la formation <strong>{nom_formation}</strong>.</p><p>Votre avis est essentiel pour améliorer nos prestations. Merci de remplir ce questionnaire :</p><p><a href="{lien_questionnaire}">Répondre au questionnaire</a></p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'satisfaction_froid', 'Évaluation à froid', 'Envoyée J+30/J+90 après la formation', 'Évaluation à froid — {nom_formation}', '<h2>Bonjour {prenom_apprenant},</h2><p>Il y a quelques semaines, vous avez suivi la formation <strong>{nom_formation}</strong>.</p><p>Nous aimerions connaître l''impact de cette formation sur votre activité professionnelle :</p><p><a href="{lien_questionnaire}">Répondre au questionnaire</a></p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'facture_envoi', 'Envoi de facture', 'Envoi de facture au client', 'Facture {numero_facture} — {nom_organisme}', '<h2>Bonjour {nom_contact},</h2><p>Veuillez trouver ci-joint la facture <strong>{numero_facture}</strong> d''un montant de <strong>{montant_ttc} € TTC</strong>.</p><p>Date d''échéance : <strong>{date_echeance}</strong></p><p>{conditions_paiement}</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'relance_facture', 'Relance facture impayée', 'Relance automatique pour factures en retard', 'Relance — Facture {numero_facture} en attente', '<h2>Bonjour {nom_contact},</h2><p>Sauf erreur de notre part, la facture <strong>{numero_facture}</strong> d''un montant de <strong>{montant_restant} €</strong> reste en attente de règlement.</p><p>Date d''échéance dépassée : <strong>{date_echeance}</strong></p><p>Merci de procéder au règlement dans les meilleurs délais.</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'attestation_fin', 'Attestation de fin de formation', 'Envoi de l''attestation après la formation', 'Attestation de fin de formation — {nom_formation}', '<h2>Bonjour {prenom_apprenant},</h2><p>Veuillez trouver ci-joint votre attestation de fin de formation pour :</p><p><strong>{nom_formation}</strong><br/>Du {date_debut} au {date_fin}</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'rappel_signature', 'Rappel signature document', 'Relance pour document non signé', 'Rappel — Document en attente de signature', '<h2>Bonjour {nom_contact},</h2><p>Un document est en attente de votre signature :</p><p><strong>{nom_document}</strong></p><p><a href="{lien_signature}">Signer le document</a></p><p>Cordialement,<br/>{nom_organisme}</p>', true)
  ON CONFLICT (organization_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- MIGRATION: 009_documents_signatures.sql
-- ============================================================

-- ============================================================
-- MODULE 11 : DOCUMENTS & SIGNATURES ÉLECTRONIQUES
-- ============================================================

CREATE TYPE document_type AS ENUM (
  'devis', 'convention', 'contrat', 'convocation', 'programme',
  'reglement_interieur', 'emargement', 'attestation_fin',
  'attestation_assiduite', 'certificat_realisation',
  'facture', 'avoir', 'autre'
);

CREATE TYPE signature_status AS ENUM (
  'en_attente',
  'signe',
  'refuse',
  'expire'
);

-- ============================================================
-- TABLE : documents
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Identification
  nom TEXT NOT NULL,
  type document_type NOT NULL DEFAULT 'autre',
  description TEXT,
  -- Fichier
  file_url TEXT, -- URL Supabase Storage
  file_name TEXT,
  file_size INTEGER, -- octets
  mime_type TEXT,
  -- Relations
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  apprenant_id UUID REFERENCES apprenants(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  dossier_id UUID REFERENCES dossiers_formation(id) ON DELETE SET NULL,
  devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES factures(id) ON DELETE SET NULL,
  convention_id UUID REFERENCES conventions(id) ON DELETE SET NULL,
  -- Signature
  requires_signature BOOLEAN DEFAULT false,
  -- Versioning
  version INTEGER DEFAULT 1,
  -- Meta
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_type ON documents(organization_id, type);
CREATE INDEX idx_documents_session ON documents(session_id);
CREATE INDEX idx_documents_dossier ON documents(dossier_id);

CREATE TRIGGER tr_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : signatures
-- ============================================================

CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  -- Signataire
  signataire_nom TEXT NOT NULL,
  signataire_email TEXT NOT NULL,
  signataire_role TEXT, -- 'client', 'apprenant', 'formateur', 'of'
  -- Token & accès
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  -- Statut
  status signature_status NOT NULL DEFAULT 'en_attente',
  -- Signature
  signature_data TEXT, -- Base64 image ou hash
  signed_at TIMESTAMPTZ,
  signed_ip INET,
  signed_user_agent TEXT,
  -- Refus
  refuse_at TIMESTAMPTZ,
  refuse_motif TEXT,
  -- Relances
  relance_count INTEGER DEFAULT 0,
  derniere_relance_at TIMESTAMPTZ,
  -- Expiration
  expire_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signatures_document ON signatures(document_id);
CREATE INDEX idx_signatures_token ON signatures(token);
CREATE INDEX idx_signatures_status ON signatures(organization_id, status);

CREATE TRIGGER tr_signatures_updated_at
  BEFORE UPDATE ON signatures FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_documents" ON documents
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_signatures" ON signatures
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Allow public token-based access for signing
CREATE POLICY "public_signature_by_token" ON signatures
  FOR SELECT USING (true);


-- ============================================================
-- MIGRATION: 010_portails.sql
-- ============================================================

-- ============================================================
-- MODULE 12 : PORTAILS APPRENANT & FORMATEUR
-- ============================================================

-- ============================================================
-- TABLE : portal_access_tokens (accès sans compte)
-- ============================================================

CREATE TABLE portal_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Cible
  type TEXT NOT NULL, -- 'apprenant', 'formateur'
  apprenant_id UUID REFERENCES apprenants(id) ON DELETE CASCADE,
  formateur_id UUID REFERENCES formateurs(id) ON DELETE CASCADE,
  -- Token
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  email TEXT NOT NULL,
  -- Validité
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portal_tokens_token ON portal_access_tokens(token);
CREATE INDEX idx_portal_tokens_apprenant ON portal_access_tokens(apprenant_id);
CREATE INDEX idx_portal_tokens_formateur ON portal_access_tokens(formateur_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE portal_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_portal_tokens" ON portal_access_tokens
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Public read for token validation
CREATE POLICY "public_portal_token_read" ON portal_access_tokens
  FOR SELECT USING (true);


-- ============================================================
-- POST-MIGRATION : Initialisation
-- ============================================================
-- Après avoir créé votre premier compte (Super Admin),
-- exécutez ces commandes pour initialiser les données :
--
-- SELECT seed_qualiopi_indicateurs('VOTRE_ORG_ID');
-- SELECT seed_email_templates('VOTRE_ORG_ID');
--
-- L'org_id est créé automatiquement lors de l'inscription.
-- Vous le trouverez dans la table organizations.
-- ============================================================
