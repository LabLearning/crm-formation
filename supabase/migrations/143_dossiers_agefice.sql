-- 143 — Dossiers AGEFICE : financement des dirigeants non salariés (TNS).
-- Circuit spécifique : dépôt via un Point d'Accueil entre 15 jours et 4 mois
-- avant la formation, remboursement sous 4 mois après la fin.

-- Nouveau financeur sur les clients (enum existant)
ALTER TYPE financeur_type ADD VALUE IF NOT EXISTS 'agefice';

CREATE TABLE IF NOT EXISTS dossiers_agefice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  apprenant_id uuid REFERENCES apprenants(id) ON DELETE SET NULL,
  formation_id uuid REFERENCES formations(id) ON DELETE SET NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  -- a_constituer | depose | accorde | refuse | en_formation | remboursement | solde
  statut text NOT NULL DEFAULT 'a_constituer',
  -- obligatoire | metier | diplomante_rncp (enveloppe 5000 €)
  categorie text NOT NULL DEFAULT 'metier',
  -- presentiel (42 €/h) | distanciel_synchrone (35 €/h) | distanciel_asynchrone (20 €/h)
  modalite text NOT NULL DEFAULT 'presentiel',
  duree_heures numeric,
  cout_pedagogique numeric,
  -- CFP versée < 7 € : enveloppe réduite à 600 €/an
  cfp_faible boolean NOT NULL DEFAULT false,
  montant_demande numeric,
  montant_accorde numeric,
  montant_rembourse numeric,
  point_accueil text,
  point_accueil_email text,
  numero_dossier text,
  -- Règlement du client vers l'OF (paiement direct obligatoire, jamais d'avance)
  mode_reglement text,          -- virement | cheque
  reference_reglement text,     -- n° de virement ou n° de chèque
  date_reglement date,
  facture_id uuid REFERENCES factures(id) ON DELETE SET NULL,
  date_debut_formation date,
  date_fin_formation date,
  date_depot date,
  date_accord date,
  date_remboursement date,
  -- Checklist des pièces : { "formulaire": true, "attestation_cfp": false, ... }
  pieces jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agefice_org ON dossiers_agefice(organization_id);
CREATE INDEX IF NOT EXISTS idx_agefice_statut ON dossiers_agefice(organization_id, statut);

-- Service role uniquement (pattern du projet post-audit)
ALTER TABLE dossiers_agefice ENABLE ROW LEVEL SECURITY;
