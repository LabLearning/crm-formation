-- ============================================================
-- 130 — Attestation d'hygiène alimentaire
--
-- L'attestation de formation spécifique en matière d'hygiène alimentaire
-- (arrêté du 12 février 2024) n'est ni une attestation de fin de formation ni
-- un certificat de réalisation : c'est le document réglementaire que
-- l'établissement présente lors d'un contrôle de la DDPP. Elle s'ajoute aux
-- documents de clôture sur toute formation en hygiène alimentaire — soit
-- 242 sessions au catalogue Lab Learning.
--
-- Elle doit donc porter son propre type, faute de quoi elle serait confondue
-- au dossier avec l'attestation de fin et resterait introuvable le jour où un
-- restaurateur la redemande.
-- ============================================================

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'attestation_hygiene';
