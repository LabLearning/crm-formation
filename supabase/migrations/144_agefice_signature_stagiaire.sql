-- Signature du stagiaire sur l'attestation d'assiduité et de règlement AGEFICE.
-- Le dirigeant signe en ligne depuis son portail (/portail/{token}/attestations),
-- la signature s'imprime dans le cartouche « Le stagiaire » du PDF.
ALTER TABLE dossiers_agefice
  ADD COLUMN IF NOT EXISTS signature_stagiaire_data text,
  ADD COLUMN IF NOT EXISTS signature_stagiaire_date timestamptz;
