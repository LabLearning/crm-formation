-- ============================================================
-- MODULE 5 : DEVIS, CONVENTIONS, DOSSIERS DE FORMATION
-- ============================================================

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE devis_status AS ENUM (
  'brouillon',
  'envoye',
  'accepte',
  'refuse',
  'expire'
);

CREATE TYPE convention_status AS ENUM (
  'brouillon',
  'envoyee',
  'signee_client',
  'signee_of',
  'signee_complete',
  'annulee'
);

CREATE TYPE dossier_status AS ENUM (
  'en_creation',
  'devis_envoye',
  'convention_signee',
  'en_cours',
  'realise',
  'facture',
  'cloture'
);

CREATE TYPE convention_type AS ENUM (
  'inter_entreprise',
  'intra_entreprise',
  'individuelle'
);

-- ============================================================
-- TABLE : devis
-- ============================================================

CREATE TABLE devis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation
  numero TEXT NOT NULL, -- DEV-2024-001
  -- Relations
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  dossier_id UUID REFERENCES dossiers_formation(id) ON DELETE SET NULL,
  -- Statut
  status devis_status NOT NULL DEFAULT 'brouillon',
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_validite DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  date_acceptation DATE,
  date_refus DATE,
  motif_refus TEXT,
  -- Montants
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  taux_tva DECIMAL(4,2) DEFAULT 20.00,
  montant_tva DECIMAL(12,2) DEFAULT 0,
  montant_ttc DECIMAL(12,2) DEFAULT 0,
  remise_pourcent DECIMAL(5,2) DEFAULT 0,
  remise_montant DECIMAL(12,2) DEFAULT 0,
  -- Contenu
  objet TEXT,
  conditions_particulieres TEXT,
  notes_internes TEXT,
  -- Suivi
  sent_at TIMESTAMPTZ,
  sent_to TEXT, -- Email destinataire
  relance_count INTEGER DEFAULT 0,
  last_relance_at TIMESTAMPTZ,
  -- Meta
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devis_org ON devis(organization_id);
CREATE INDEX idx_devis_client ON devis(client_id);
CREATE INDEX idx_devis_status ON devis(organization_id, status);
CREATE INDEX idx_devis_numero ON devis(organization_id, numero);

CREATE TRIGGER tr_devis_updated_at
  BEFORE UPDATE ON devis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : devis_lignes
-- ============================================================

CREATE TABLE devis_lignes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  devis_id UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  -- Contenu
  designation TEXT NOT NULL,
  description TEXT,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  -- Quantité & prix
  quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
  unite TEXT DEFAULT 'forfait', -- forfait, heure, jour, personne
  prix_unitaire_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Ordre
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devis_lignes_devis ON devis_lignes(devis_id);

-- ============================================================
-- TABLE : dossiers_formation (dossier complet)
-- ============================================================

CREATE TABLE dossiers_formation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation
  numero TEXT NOT NULL, -- DOS-2024-001
  -- Relations
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES formations(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Statut
  status dossier_status NOT NULL DEFAULT 'en_creation',
  -- Financement
  financeur_type financeur_type,
  financeur_nom TEXT,
  numero_prise_en_charge TEXT,
  montant_prise_en_charge DECIMAL(12,2),
  date_accord_financement DATE,
  -- Montants
  montant_total_ht DECIMAL(12,2) DEFAULT 0,
  montant_total_ttc DECIMAL(12,2) DEFAULT 0,
  -- Dates clés
  date_creation DATE DEFAULT CURRENT_DATE,
  date_devis DATE,
  date_convention DATE,
  date_debut_formation DATE,
  date_fin_formation DATE,
  date_facturation DATE,
  date_cloture DATE,
  -- Suivi
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dossiers_org ON dossiers_formation(organization_id);
CREATE INDEX idx_dossiers_client ON dossiers_formation(client_id);
CREATE INDEX idx_dossiers_status ON dossiers_formation(organization_id, status);

CREATE TRIGGER tr_dossiers_updated_at
  BEFORE UPDATE ON dossiers_formation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : conventions
-- ============================================================

CREATE TABLE conventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Numérotation
  numero TEXT NOT NULL, -- CONV-2024-001
  type convention_type NOT NULL DEFAULT 'inter_entreprise',
  -- Relations
  dossier_id UUID REFERENCES dossiers_formation(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  -- Statut
  status convention_status NOT NULL DEFAULT 'brouillon',
  -- Contenu
  objet TEXT,
  nombre_stagiaires INTEGER DEFAULT 1,
  duree_heures DECIMAL(8,2),
  lieu TEXT,
  dates_formation TEXT, -- Texte libre pour les dates
  -- Montants
  montant_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  taux_tva DECIMAL(4,2) DEFAULT 20.00,
  montant_ttc DECIMAL(12,2) DEFAULT 0,
  -- Financement
  financeur_type financeur_type,
  financeur_nom TEXT,
  numero_prise_en_charge TEXT,
  -- Signatures
  signature_client_date TIMESTAMPTZ,
  signature_client_nom TEXT,
  signature_of_date TIMESTAMPTZ,
  signature_of_nom TEXT,
  -- Dates
  date_emission DATE DEFAULT CURRENT_DATE,
  sent_at TIMESTAMPTZ,
  -- Meta
  notes_internes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conventions_org ON conventions(organization_id);
CREATE INDEX idx_conventions_dossier ON conventions(dossier_id);
CREATE INDEX idx_conventions_status ON conventions(organization_id, status);

CREATE TRIGGER tr_conventions_updated_at
  BEFORE UPDATE ON conventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : dossier_checklist (complétude documentaire)
-- ============================================================

CREATE TABLE dossier_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES dossiers_formation(id) ON DELETE CASCADE,
  -- Item
  label TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'administratif', -- administratif, pedagogique, financier
  is_required BOOLEAN DEFAULT true,
  -- Statut
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  document_url TEXT, -- Lien vers le document dans Storage
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dossier_checklist ON dossier_checklist(dossier_id);

-- ============================================================
-- TABLE : dossier_timeline (historique du dossier)
-- ============================================================

CREATE TABLE dossier_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES dossiers_formation(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- ex: 'devis_cree', 'convention_signee', 'formation_demarree'
  description TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dossier_timeline ON dossier_timeline(dossier_id, created_at DESC);

-- ============================================================
-- FUNCTION : auto-populate checklist on dossier creation
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dossier_checklist (dossier_id, label, categorie, is_required) VALUES
    (NEW.id, 'Devis envoyé et accepté', 'administratif', true),
    (NEW.id, 'Convention de formation signée', 'administratif', true),
    (NEW.id, 'Convocation envoyée aux stagiaires', 'administratif', true),
    (NEW.id, 'Programme de formation transmis', 'pedagogique', true),
    (NEW.id, 'Règlement intérieur transmis', 'administratif', true),
    (NEW.id, 'Test de positionnement réalisé', 'pedagogique', false),
    (NEW.id, 'Feuilles d''émargement signées', 'administratif', true),
    (NEW.id, 'Évaluation des acquis réalisée', 'pedagogique', true),
    (NEW.id, 'Questionnaire de satisfaction envoyé', 'pedagogique', true),
    (NEW.id, 'Attestation de fin de formation émise', 'administratif', true),
    (NEW.id, 'Certificat de réalisation émis', 'administratif', true),
    (NEW.id, 'Facture émise', 'financier', true),
    (NEW.id, 'Paiement reçu', 'financier', true),
    (NEW.id, 'Accord de prise en charge OPCO', 'financier', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_dossier_checklist
  AFTER INSERT ON dossiers_formation
  FOR EACH ROW EXECUTE FUNCTION create_default_checklist();

-- ============================================================
-- FUNCTION : auto-generate devis numero
-- ============================================================

CREATE OR REPLACE FUNCTION generate_devis_numero()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    SELECT COUNT(*) + 1 INTO seq_num
    FROM devis
    WHERE organization_id = NEW.organization_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.numero := 'DEV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_devis_numero
  BEFORE INSERT ON devis
  FOR EACH ROW EXECUTE FUNCTION generate_devis_numero();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers_formation ENABLE ROW LEVEL SECURITY;
ALTER TABLE conventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_devis" ON devis
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_devis_lignes" ON devis_lignes
  FOR ALL USING (devis_id IN (SELECT id FROM devis WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_dossiers" ON dossiers_formation
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_conventions" ON conventions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_dossier_checklist" ON dossier_checklist
  FOR ALL USING (dossier_id IN (SELECT id FROM dossiers_formation WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_isolation_dossier_timeline" ON dossier_timeline
  FOR ALL USING (dossier_id IN (SELECT id FROM dossiers_formation WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));
