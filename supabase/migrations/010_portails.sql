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
