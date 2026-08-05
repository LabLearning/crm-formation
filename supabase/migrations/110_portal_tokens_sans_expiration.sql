-- ============================================================
-- 110 — Liens de portail : jamais d'expiration + email facultatif
--   • Un lien diffusé (QR, WhatsApp, papier) ne doit jamais casser :
--     seule la désactivation explicite (is_active = false) le révoque.
--   • Un apprenant sans email doit pouvoir avoir un lien (QR code,
--     lien transmis de la main à la main) : email devient facultatif.
-- ============================================================

-- 1) L'email n'est plus obligatoire (bloquait la création de lien pour les
--    apprenants sans adresse — cas LBG Malakoff).
ALTER TABLE portal_access_tokens ALTER COLUMN email DROP NOT NULL;

-- 2) Plus d'expiration par défaut sur les nouveaux liens.
ALTER TABLE portal_access_tokens ALTER COLUMN expires_at DROP DEFAULT;

-- 3) Les liens déjà diffusés n'expirent plus.
UPDATE portal_access_tokens SET expires_at = NULL WHERE expires_at IS NOT NULL;
