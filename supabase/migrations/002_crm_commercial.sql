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
