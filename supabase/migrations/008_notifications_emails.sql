-- ============================================================
-- MODULE 10 : NOTIFICATIONS & EMAILS
-- ============================================================

-- ============================================================
-- TABLE : notifications (internes)
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Contenu
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, danger, action
  -- Lien
  lien_url TEXT,
  lien_label TEXT,
  -- Entité liée
  entity_type TEXT,
  entity_id UUID,
  -- Statut
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_org ON notifications(organization_id);

-- ============================================================
-- TABLE : email_logs
-- ============================================================

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Destinataire
  to_email TEXT NOT NULL,
  to_name TEXT,
  -- Contenu
  subject TEXT NOT NULL,
  template TEXT NOT NULL, -- Nom du template
  variables JSONB, -- Variables injectées
  -- Entité liée
  entity_type TEXT,
  entity_id UUID,
  -- Résultat
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, bounced
  resend_id TEXT, -- ID Resend
  error TEXT,
  -- Dates
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  -- Meta
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_org ON email_logs(organization_id);
CREATE INDEX idx_email_logs_entity ON email_logs(entity_type, entity_id);
CREATE INDEX idx_email_logs_status ON email_logs(organization_id, status);

-- ============================================================
-- TABLE : email_templates
-- ============================================================

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Identification
  slug TEXT NOT NULL, -- ex: devis_envoye, convocation, satisfaction
  nom TEXT NOT NULL,
  description TEXT,
  -- Contenu
  sujet TEXT NOT NULL, -- Sujet avec variables {nom_apprenant}
  corps_html TEXT NOT NULL, -- HTML avec variables
  corps_texte TEXT, -- Version texte
  -- Config
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- Non supprimable
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_email_templates ON email_templates(organization_id, slug);

CREATE TRIGGER tr_email_templates_updated_at
  BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "org_isolation_email_logs" ON email_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_email_templates" ON email_templates
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- FUNCTION : seed default email templates
-- ============================================================

CREATE OR REPLACE FUNCTION seed_email_templates(org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO email_templates (organization_id, slug, nom, description, sujet, corps_html, is_system) VALUES
  (org_id, 'devis_envoye', 'Envoi de devis', 'Envoyé automatiquement lors de l''envoi d''un devis', 'Devis {numero_devis} — {nom_organisme}', '<h2>Bonjour {nom_contact},</h2><p>Veuillez trouver ci-joint le devis <strong>{numero_devis}</strong> d''un montant de <strong>{montant_ttc} € TTC</strong>.</p><p>Ce devis est valable jusqu''au <strong>{date_validite}</strong>.</p><p>N''hésitez pas à nous contacter pour toute question.</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'convention_signature', 'Convention à signer', 'Envoi de convention pour signature', 'Convention de formation {numero_convention} à signer', '<h2>Bonjour {nom_contact},</h2><p>Veuillez trouver ci-joint la convention de formation <strong>{numero_convention}</strong> pour la formation <strong>{nom_formation}</strong>.</p><p>Merci de signer ce document et de nous le retourner.</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'convocation', 'Convocation formation', 'Envoyée aux apprenants avant la session', 'Convocation — {nom_formation} du {date_debut}', '<h2>Bonjour {prenom_apprenant},</h2><p>Nous avons le plaisir de vous confirmer votre inscription à la formation :</p><p><strong>{nom_formation}</strong><br/>Du {date_debut} au {date_fin}<br/>{horaires}<br/>Lieu : {lieu}</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'satisfaction_chaud', 'Questionnaire satisfaction', 'Envoyé en fin de formation', 'Votre avis sur la formation {nom_formation}', '<h2>Bonjour {prenom_apprenant},</h2><p>Vous venez de terminer la formation <strong>{nom_formation}</strong>.</p><p>Votre avis est essentiel pour améliorer nos prestations. Merci de remplir ce questionnaire :</p><p><a href="{lien_questionnaire}">Répondre au questionnaire</a></p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'satisfaction_froid', 'Évaluation à froid', 'Envoyée J+30/J+90 après la formation', 'Évaluation à froid — {nom_formation}', '<h2>Bonjour {prenom_apprenant},</h2><p>Il y a quelques semaines, vous avez suivi la formation <strong>{nom_formation}</strong>.</p><p>Nous aimerions connaître l''impact de cette formation sur votre activité professionnelle :</p><p><a href="{lien_questionnaire}">Répondre au questionnaire</a></p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'facture_envoi', 'Envoi de facture', 'Envoi de facture au client', 'Facture {numero_facture} — {nom_organisme}', '<h2>Bonjour {nom_contact},</h2><p>Veuillez trouver ci-joint la facture <strong>{numero_facture}</strong> d''un montant de <strong>{montant_ttc} € TTC</strong>.</p><p>Date d''échéance : <strong>{date_echeance}</strong></p><p>{conditions_paiement}</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'relance_facture', 'Relance facture impayée', 'Relance automatique pour factures en retard', 'Relance — Facture {numero_facture} en attente', '<h2>Bonjour {nom_contact},</h2><p>Sauf erreur de notre part, la facture <strong>{numero_facture}</strong> d''un montant de <strong>{montant_restant} €</strong> reste en attente de règlement.</p><p>Date d''échéance dépassée : <strong>{date_echeance}</strong></p><p>Merci de procéder au règlement dans les meilleurs délais.</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'attestation_fin', 'Attestation de fin de formation', 'Envoi de l''attestation après la formation', 'Attestation de fin de formation — {nom_formation}', '<h2>Bonjour {prenom_apprenant},</h2><p>Veuillez trouver ci-joint votre attestation de fin de formation pour :</p><p><strong>{nom_formation}</strong><br/>Du {date_debut} au {date_fin}</p><p>Cordialement,<br/>{nom_organisme}</p>', true),
  (org_id, 'rappel_signature', 'Rappel signature document', 'Relance pour document non signé', 'Rappel — Document en attente de signature', '<h2>Bonjour {nom_contact},</h2><p>Un document est en attente de votre signature :</p><p><strong>{nom_document}</strong></p><p><a href="{lien_signature}">Signer le document</a></p><p>Cordialement,<br/>{nom_organisme}</p>', true)
  ON CONFLICT (organization_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
