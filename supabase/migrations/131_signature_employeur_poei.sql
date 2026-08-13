-- ============================================================
-- 131 — Signature de l'employeur sur l'attestation POEI
--
-- L'attestation de développement de compétences (formulaire France Travail)
-- porte trois signatures : le bénéficiaire, le tuteur et l'employeur. Les deux
-- premières existent déjà dans le CRM — certificat signé en ligne par le
-- candidat, contrat signé par le formateur. Celle de l'employeur n'avait ni
-- circuit ni stockage.
--
-- Le circuit de signature par lien des certificats est réutilisé tel quel :
-- une ligne de certificat_signatures portée par la POEI, sans candidat —
-- le représentant de l'établissement signe une fois pour tous les candidats.
-- ============================================================

ALTER TABLE certificat_signatures
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'candidat';

COMMENT ON COLUMN certificat_signatures.role IS
  'candidat : signature du bénéficiaire sur son certificat. employeur : signature du représentant de l''établissement sur l''attestation de développement de compétences, une par POEI.';

-- Le signataire employeur n'est pas un apprenant.
ALTER TABLE certificat_signatures
  ALTER COLUMN apprenant_id DROP NOT NULL;

-- Une seule demande de signature employeur par POEI.
CREATE UNIQUE INDEX IF NOT EXISTS certificat_signatures_employeur_unique
  ON certificat_signatures (poei_id)
  WHERE role = 'employeur';

-- ── Le représentant de l'employeur, porté par le projet POEI ─────────────
-- C'est lui qui signe l'attestation et reçoit le lien : le deviner depuis les
-- contacts du client était fragile — le signataire de la POEI n'est pas
-- toujours le signataire commercial du compte.
ALTER TABLE poei
  ADD COLUMN IF NOT EXISTS employeur_prenom text,
  ADD COLUMN IF NOT EXISTS employeur_nom text,
  ADD COLUMN IF NOT EXISTS employeur_email text,
  ADD COLUMN IF NOT EXISTS employeur_telephone text;

COMMENT ON COLUMN poei.employeur_nom IS
  'Représentant de l''établissement employeur : signe l''attestation de développement de compétences et reçoit le lien de signature.';

-- Reprise : le contact signataire du client, à défaut le principal.
UPDATE poei p
SET employeur_prenom = c.prenom,
    employeur_nom = c.nom,
    employeur_email = c.email,
    employeur_telephone = c.telephone
FROM (
  SELECT DISTINCT ON (client_id) client_id, prenom, nom, email, telephone
  FROM contacts
  ORDER BY client_id, est_signataire DESC, est_principal DESC, created_at
) c
WHERE c.client_id = p.client_id
  AND p.employeur_nom IS NULL;
