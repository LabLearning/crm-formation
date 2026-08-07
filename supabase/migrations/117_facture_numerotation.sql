-- ============================================================
-- 117 — Numérotation des factures : série unique et continue
--
-- L'ancien trigger numérotait avec COUNT(*) + 1 sur l'année. Trois défauts :
--   1. après suppression d'une facture, le numéro suivant est RÉUTILISÉ →
--      doublon, ce qui est interdit (art. 242 nonies A ann. II CGI) ;
--   2. il ignore la série réellement en cours : avec 296 factures reprises de
--      Dendreo (FA-2026-0001 → FA-2026-0172), il aurait produit FA-2026-0327 ;
--   3. deux inserts simultanés obtiennent le même numéro.
--
-- On repart du plus grand numéro EXISTANT de la série FA-<année>-<4 chiffres>,
-- sous verrou consultatif par organisation et par année. Les séries reprises
-- d'ailleurs (FA-EP-, FA-OC-, FA-DIV-) ne participent pas au calcul.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_facture_numero()
RETURNS TRIGGER AS $$
DECLARE
  annee   INTEGER;
  prefix  TEXT;
  suivant INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL AND NEW.numero <> '' THEN
    RETURN NEW;
  END IF;

  annee  := EXTRACT(YEAR FROM COALESCE(NEW.date_emission, CURRENT_DATE))::INTEGER;
  prefix := CASE NEW.type WHEN 'avoir' THEN 'AV' ELSE 'FA' END;

  -- Sérialise les attributions concurrentes pour cette organisation et cette année.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::TEXT || prefix || annee::TEXT));

  SELECT COALESCE(MAX(SUBSTRING(numero FROM '\d+$')::INTEGER), 0) + 1
    INTO suivant
    FROM factures
   WHERE organization_id = NEW.organization_id
     AND numero ~ ('^' || prefix || '-' || annee || '-\d+$');

  NEW.numero := prefix || '-' || annee || '-' || LPAD(suivant::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Un même numéro ne peut pas exister deux fois dans une organisation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_factures_numero_org
  ON factures (organization_id, numero);
