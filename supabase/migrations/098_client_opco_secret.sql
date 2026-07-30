-- Compte OPCO du client (identifiants d'accès au portail) stocké CHIFFRÉ.
-- Blob AES-256-GCM (voir lib/secret-vault) ; le mot de passe n'est pas stocké.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS opco_compte_chiffre jsonb;

COMMENT ON COLUMN clients.opco_compte_chiffre IS
  'Identifiants du compte OPCO chiffres (AES-256-GCM, mot de passe non stocke).';
