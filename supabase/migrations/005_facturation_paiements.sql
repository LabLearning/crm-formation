-- ============================================================
-- MODULE 6 : FACTURATION & PAIEMENTS
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE facture_type AS ENUM (
  'facture',
  'acompte',
  'solde',
  'avoir'
);

CREATE TYPE facture_status AS ENUM (
  'brouillon',
  'emise',
  'envoyee',
  'payee_partiellement',
  'payee',
  'en_retard',
  'annulee'
);

CREATE TYPE paiement_mode AS ENUM (
  'virement',
  'cb',
  'cheque',
  'prelevement',
  'especes',
  'stripe',
  'opco',
  'cpf',
  'autre'
);

CREATE TYPE paiement_status AS ENUM (
  'en_attente',
  'valide',
  'refuse',
  'rembourse'
);

-- ============================================================
-- TABLE : factures
-- ============================================================

CREATE TABLE factures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation (séquentielle, obligatoire légalement)
  numero TEXT NOT NULL UNIQUE,
  type facture_type NOT NULL DEFAULT 'facture',
  -- Relations
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  convention_id UUID REFERENCES conventions(id) ON DELETE SET NULL,
  dossier_id UUID REFERENCES dossiers_formation(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Avoir lié
  facture_origine_id UUID REFERENCES factures(id) ON DELETE SET NULL, -- Si avoir, référence la facture d'origine
  -- Statut
  status facture_status NOT NULL DEFAULT 'brouillon',
  -- Dates
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  date_envoi TIMESTAMPTZ,
  date_paiement_complet DATE,
  -- Montants
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  taux_tva DECIMAL(4,2) DEFAULT 20.00,
  montant_tva DECIMAL(12,2) DEFAULT 0,
  montant_ttc DECIMAL(12,2) DEFAULT 0,
  montant_paye DECIMAL(12,2) DEFAULT 0,
  montant_restant DECIMAL(12,2) DEFAULT 0,
  -- Remise
  remise_pourcent DECIMAL(5,2) DEFAULT 0,
  remise_montant DECIMAL(12,2) DEFAULT 0,
  -- Contenu
  objet TEXT,
  conditions_paiement TEXT DEFAULT 'Paiement à 30 jours',
  mentions_legales TEXT,
  notes_internes TEXT,
  -- Financement
  financeur_type financeur_type,
  financeur_nom TEXT,
  numero_prise_en_charge TEXT,
  subrogation BOOLEAN DEFAULT false, -- Paiement direct par le financeur
  -- Relances
  relance_count INTEGER DEFAULT 0,
  derniere_relance_at TIMESTAMPTZ,
  prochaine_relance_at TIMESTAMPTZ,
  -- Stripe
  stripe_invoice_id TEXT,
  stripe_payment_url TEXT,
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_factures_org ON factures(organization_id);
CREATE INDEX idx_factures_client ON factures(client_id);
CREATE INDEX idx_factures_status ON factures(organization_id, status);
CREATE INDEX idx_factures_numero ON factures(numero);
CREATE INDEX idx_factures_dossier ON factures(dossier_id);
CREATE INDEX idx_factures_echeance ON factures(date_echeance) WHERE status IN ('emise', 'envoyee', 'payee_partiellement');

CREATE TRIGGER tr_factures_updated_at
  BEFORE UPDATE ON factures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : facture_lignes
-- ============================================================

CREATE TABLE facture_lignes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  description TEXT,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Quantité & prix
  quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
  unite TEXT DEFAULT 'forfait',
  prix_unitaire_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Ordre
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facture_lignes ON facture_lignes(facture_id);

-- ============================================================
-- TABLE : paiements
-- ============================================================

CREATE TABLE paiements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  -- Montant
  montant DECIMAL(12,2) NOT NULL,
  -- Mode
  mode paiement_mode NOT NULL DEFAULT 'virement',
  status paiement_status NOT NULL DEFAULT 'en_attente',
  -- Dates
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  date_validation TIMESTAMPTZ,
  -- Références
  reference TEXT, -- N° de chèque, ref virement, etc.
  stripe_payment_id TEXT,
  stripe_charge_id TEXT,
  -- Payeur
  payeur_nom TEXT, -- Si différent du client (ex: OPCO)
  payeur_type TEXT, -- 'client', 'opco', 'france_travail', 'cpf'
  -- Meta
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_paiements_facture ON paiements(facture_id);
CREATE INDEX idx_paiements_org ON paiements(organization_id);
CREATE INDEX idx_paiements_status ON paiements(organization_id, status);
CREATE INDEX idx_paiements_date ON paiements(date_paiement DESC);

CREATE TRIGGER tr_paiements_updated_at
  BEFORE UPDATE ON paiements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION : auto-generate facture numero
-- ============================================================

CREATE OR REPLACE FUNCTION generate_facture_numero()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
  prefix TEXT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    prefix := CASE NEW.type
      WHEN 'avoir' THEN 'AV'
      WHEN 'acompte' THEN 'FA'
      ELSE 'FA'
    END;
    SELECT COUNT(*) + 1 INTO seq_num
    FROM factures
    WHERE organization_id = NEW.organization_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.numero := prefix || '-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_facture_numero
  BEFORE INSERT ON factures
  FOR EACH ROW EXECUTE FUNCTION generate_facture_numero();

-- ============================================================
-- FUNCTION : update facture amounts on paiement change
-- ============================================================

CREATE OR REPLACE FUNCTION update_facture_paiements()
RETURNS TRIGGER AS $$
DECLARE
  total_paye DECIMAL(12,2);
  fac_ttc DECIMAL(12,2);
  fac_id UUID;
BEGIN
  fac_id := COALESCE(NEW.facture_id, OLD.facture_id);

  SELECT COALESCE(SUM(montant), 0) INTO total_paye
  FROM paiements
  WHERE facture_id = fac_id AND status = 'valide';

  SELECT montant_ttc INTO fac_ttc FROM factures WHERE id = fac_id;

  UPDATE factures SET
    montant_paye = total_paye,
    montant_restant = GREATEST(fac_ttc - total_paye, 0),
    status = CASE
      WHEN total_paye >= fac_ttc THEN 'payee'
      WHEN total_paye > 0 THEN 'payee_partiellement'
      ELSE status
    END,
    date_paiement_complet = CASE WHEN total_paye >= fac_ttc THEN CURRENT_DATE ELSE NULL END
  WHERE id = fac_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_paiement_update_facture
  AFTER INSERT OR UPDATE OR DELETE ON paiements
  FOR EACH ROW EXECUTE FUNCTION update_facture_paiements();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE facture_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_factures" ON factures
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_facture_lignes" ON facture_lignes
  FOR ALL USING (facture_id IN (SELECT id FROM factures WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_paiements" ON paiements
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
