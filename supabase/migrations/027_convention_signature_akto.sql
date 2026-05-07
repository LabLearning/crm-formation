-- ============================================================
-- 027 — Signature électronique convention + numéro AKTO
-- ============================================================
-- Permet au client de signer la convention via un lien public sécurisé
-- (token unique). À la signature, on déclenche la demande de prise en
-- charge auprès de l'OPCO (AKTO) et on stocke le numéro retour.

ALTER TABLE conventions
  ADD COLUMN IF NOT EXISTS signature_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS signature_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_client_signature_data TEXT,  -- Image base64 du tracé tactile
  ADD COLUMN IF NOT EXISTS signature_client_ip TEXT,
  ADD COLUMN IF NOT EXISTS signature_client_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS akto_dossier_status TEXT DEFAULT 'non_envoye',
  ADD COLUMN IF NOT EXISTS akto_dossier_envoye_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS akto_dossier_numero TEXT,
  ADD COLUMN IF NOT EXISTS akto_accord_recu_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS akto_accord_url TEXT;

CREATE INDEX IF NOT EXISTS idx_conventions_sign_token ON conventions(signature_token) WHERE signature_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conventions_akto ON conventions(organization_id, akto_dossier_status);

COMMENT ON COLUMN conventions.signature_token IS 'Token unique pour la page publique de signature client';
COMMENT ON COLUMN conventions.akto_dossier_status IS 'non_envoye / envoye / accord_recu / refuse';
COMMENT ON COLUMN conventions.akto_dossier_numero IS 'Numéro du dossier OPCO retourné après acceptation';

-- ============================================================
-- Convocations J-3 (apprenants + formateur)
-- ============================================================
-- Un flag pour savoir si les convocations ont déjà été envoyées,
-- évite les doublons si le cron passe plusieurs fois.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS convocations_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS convocations_sent_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- QR Codes apprenants — token d'accès au portail (apprenant_token)
-- ============================================================
-- On réutilise le système portal_access_tokens existant.
-- Pas besoin de nouvelle colonne, juste un index pour retrouver vite.

CREATE INDEX IF NOT EXISTS idx_portal_access_tokens_apprenant
  ON portal_access_tokens(apprenant_id) WHERE apprenant_id IS NOT NULL;
