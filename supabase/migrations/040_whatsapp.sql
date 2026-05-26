-- ============================================================
-- 040 — Canal WhatsApp (Meta Cloud API)
-- ============================================================
-- Permet d'envoyer rappels/notifications par WhatsApp en plus de l'email.
-- Meta impose : numéro Business vérifié, templates pré-approuvés, opt-in client.
--
-- Champs ajoutés : numéro WhatsApp dédié (E.164) + consentement (opt-in)
-- sur clients, contacts et apprenants. Table whatsapp_logs pour la traçabilité.
-- ============================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT FALSE;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT FALSE;

ALTER TABLE apprenants
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT FALSE;

-- Toggle global d'activation du canal WhatsApp pour l'organisation
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;

-- ============================================================
-- Journal des envois WhatsApp (traçabilité, comme email_logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  to_name TEXT,
  template TEXT NOT NULL,           -- nom du template Meta utilisé
  variables JSONB,                   -- paramètres injectés
  entity_type TEXT,
  entity_id UUID,
  status TEXT NOT NULL DEFAULT 'sent',   -- sent / failed / skipped / dev
  provider_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_org ON whatsapp_logs(organization_id, created_at DESC);
