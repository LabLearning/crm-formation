-- Messagerie portail : l'apprenant écrit à son formateur depuis son espace,
-- le formateur lit et répond depuis le sien. Fil par couple
-- apprenant/formateur, service role uniquement (RLS fermée, accès par token).
CREATE TABLE IF NOT EXISTS portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  apprenant_id uuid NOT NULL REFERENCES apprenants(id),
  formateur_id uuid NOT NULL REFERENCES formateurs(id),
  session_id uuid REFERENCES sessions(id),
  auteur text NOT NULL CHECK (auteur IN ('apprenant','formateur')),
  contenu text NOT NULL,
  lu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_formateur ON portal_messages(formateur_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pm_apprenant ON portal_messages(apprenant_id, created_at);
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
