-- ============================================================
-- 119 — Déroulé Pédagogique Opérationnel (DPO)
--
-- Deux objets :
--   1. l'engagement du formateur sur la méthode (signature, par version) ;
--   2. la validation des 7 étapes, session par session, avec ce qui manque.
-- Le référentiel des étapes vit dans lib/dpo.ts (versionné avec le code) ;
-- seules les validations et les signatures sont stockées.
-- ============================================================

CREATE TABLE IF NOT EXISTS dpo_signatures (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  formateur_id     uuid NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  version          text NOT NULL,
  signature_data   text,                -- image base64 de la signature manuscrite
  signed_at        timestamptz NOT NULL DEFAULT now(),
  ip_address       text,
  UNIQUE (formateur_id, version)
);

CREATE INDEX IF NOT EXISTS idx_dpo_sign_org ON dpo_signatures(organization_id, version);

CREATE TABLE IF NOT EXISTS session_deroule_etapes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id       uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  etape_cle        text NOT NULL,
  statut           text NOT NULL DEFAULT 'a_faire',   -- a_faire | fait | non_applicable
  commentaire      text,
  -- Preuve : audit AuditHygiène, document déposé, ou simple observation
  ah_audit_id      uuid,
  document_id      uuid REFERENCES documents(id) ON DELETE SET NULL,
  validated_by     uuid REFERENCES users(id),
  validated_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, etape_cle)
);

CREATE INDEX IF NOT EXISTS idx_deroule_session ON session_deroule_etapes(session_id);
CREATE INDEX IF NOT EXISTS idx_deroule_org     ON session_deroule_etapes(organization_id, statut);

ALTER TABLE dpo_signatures         ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_deroule_etapes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dpo_signatures','session_deroule_etapes'] LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))',
        t || '_org', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
