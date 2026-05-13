-- ============================================================
-- 032 — Page "Informations de l'organisme" complète (style Dendreo/Digiforma)
-- ============================================================
-- Ajoute tous les champs métier d'un organisme de formation :
-- - Identité légale complète
-- - Représentant légal
-- - Qualifications (Qualiopi, Datadock)
-- - Coordonnées bancaires
-- - Tampon + signature (image PNG) auto-utilisé comme signature OF

ALTER TABLE organizations
  -- Identité légale
  ADD COLUMN IF NOT EXISTS forme_juridique TEXT,
  ADD COLUMN IF NOT EXISTS capital_social NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS code_ape TEXT,
  ADD COLUMN IF NOT EXISTS code_naf TEXT,
  ADD COLUMN IF NOT EXISTS numero_tva_intra TEXT,
  ADD COLUMN IF NOT EXISTS rcs TEXT,
  -- Représentant légal
  ADD COLUMN IF NOT EXISTS representant_legal_civilite TEXT,
  ADD COLUMN IF NOT EXISTS representant_legal_prenom TEXT,
  ADD COLUMN IF NOT EXISTS representant_legal_nom TEXT,
  ADD COLUMN IF NOT EXISTS representant_legal_fonction TEXT,
  -- Tampon + signature (apposée auto comme signature OF)
  ADD COLUMN IF NOT EXISTS tampon_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS tampon_signature_filename TEXT,
  ADD COLUMN IF NOT EXISTS tampon_signature_uploaded_at TIMESTAMPTZ,
  -- Qualifications
  ADD COLUMN IF NOT EXISTS qualiopi_certificateur TEXT,
  ADD COLUMN IF NOT EXISTS qualiopi_certificat_numero TEXT,
  ADD COLUMN IF NOT EXISTS qualiopi_date_obtention DATE,
  ADD COLUMN IF NOT EXISTS qualiopi_date_expiration DATE,
  ADD COLUMN IF NOT EXISTS numero_datadock TEXT,
  -- Coordonnées bancaires (pour factures)
  ADD COLUMN IF NOT EXISTS banque_nom TEXT,
  ADD COLUMN IF NOT EXISTS banque_iban TEXT,
  ADD COLUMN IF NOT EXISTS banque_bic TEXT,
  ADD COLUMN IF NOT EXISTS banque_titulaire TEXT,
  -- Texte libre
  ADD COLUMN IF NOT EXISTS conditions_generales TEXT,
  ADD COLUMN IF NOT EXISTS mentions_legales TEXT,
  -- Contact général
  ADD COLUMN IF NOT EXISTS email_contact TEXT,
  ADD COLUMN IF NOT EXISTS telephone_contact TEXT;

COMMENT ON COLUMN organizations.tampon_signature_url IS
'URL du PNG tampon+signature, appliqué automatiquement comme signature OF sur conventions/contrats/factures/etc.';
COMMENT ON COLUMN organizations.qualiopi_certificateur IS
'Certificateur Qualiopi : Bureau Veritas, AFNOR, ISQ, etc.';

-- Bucket Storage pour les assets de l'organisation (logo, tampon, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organisation', 'organisation', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'organisation_service_role_all'
  ) THEN
    CREATE POLICY "organisation_service_role_all" ON storage.objects
      FOR ALL USING (bucket_id = 'organisation') WITH CHECK (bucket_id = 'organisation');
  END IF;
END $$;
