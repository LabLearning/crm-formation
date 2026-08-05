-- ============================================================
-- 109 — Signature des certificats de réalisation par les candidats
-- Chaque candidat POEI reçoit par email un lien unique pour signer
-- son certificat de réalisation.
-- ============================================================

CREATE TABLE IF NOT EXISTS certificat_signatures (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  poei_id           uuid REFERENCES poei(id) ON DELETE CASCADE,
  session_id        uuid REFERENCES sessions(id) ON DELETE CASCADE,
  apprenant_id      uuid NOT NULL REFERENCES apprenants(id) ON DELETE CASCADE,
  email             text,
  token             text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at  timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  sent_at           timestamptz,
  signed_at         timestamptz,     -- horodatage réel (traçabilité)
  date_signature    date,            -- date PORTÉE sur le certificat = dernier jour de la POEI
  signature_data    text,            -- data:image/png;base64,…
  signataire_nom    text,
  ip_address        text,
  user_agent        text,
  created_by        uuid REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, poei_id, apprenant_id)
);

CREATE INDEX IF NOT EXISTS idx_certif_sig_org   ON certificat_signatures(organization_id);
CREATE INDEX IF NOT EXISTS idx_certif_sig_poei  ON certificat_signatures(poei_id);
CREATE INDEX IF NOT EXISTS idx_certif_sig_token ON certificat_signatures(token);

ALTER TABLE certificat_signatures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY certif_sig_org ON certificat_signatures
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;
