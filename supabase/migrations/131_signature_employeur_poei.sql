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

-- Le représentant de l'employeur n'est PAS dupliqué sur la POEI : c'est le
-- contact référent de l'entreprise (contacts.est_signataire, à défaut
-- est_principal) qui signe et reçoit le lien. Une seule source, pas de copie
-- qui divergerait de la fiche client.
