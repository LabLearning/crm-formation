-- ============================================================
-- 135 — Mandat POEI (expérimentation France Travail)
--
-- L'entreprise future recruteuse mandate l'organisme de formation pour
-- réaliser en son nom les démarches POEI (dépôt d'offre, demande d'aide,
-- validation, bilan). Le mandat est signé par le gérant de l'entreprise
-- via un lien de signature électronique, puis joint à la saisie en ligne
-- de la demande.
--
-- Un mandat par projet POEI. Même mécanique de token que les signatures
-- de certificats (109).
-- ============================================================

CREATE TABLE IF NOT EXISTS poei_mandats (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  poei_id           uuid NOT NULL REFERENCES poei(id) ON DELETE CASCADE,
  email             text,
  token             text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at  timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  date_emission     date NOT NULL DEFAULT CURRENT_DATE,  -- date portée sur le mandat
  sent_at           timestamptz,
  signed_at         timestamptz,     -- horodatage réel de la signature du gérant
  signature_data    text,            -- data:image/png;base64,…
  signataire_nom    text,
  ip_address        text,
  user_agent        text,
  created_by        uuid REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, poei_id)
);

CREATE INDEX IF NOT EXISTS idx_poei_mandats_org   ON poei_mandats(organization_id);
CREATE INDEX IF NOT EXISTS idx_poei_mandats_poei  ON poei_mandats(poei_id);
CREATE INDEX IF NOT EXISTS idx_poei_mandats_token ON poei_mandats(token);

ALTER TABLE poei_mandats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY poei_mandats_org ON poei_mandats
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE poei_mandats IS
  'Mandats POEI (expérimentation France Travail) : l''employeur mandate l''OF pour la demande d''aide. Signé par le gérant via lien.';
