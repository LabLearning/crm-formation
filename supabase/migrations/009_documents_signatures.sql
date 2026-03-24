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
