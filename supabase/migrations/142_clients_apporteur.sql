-- Rattachement d'un client à son apporteur d'affaires : la base de la fiche
-- apporteur (dossiers apportés, CA généré, commissions).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS apporteur_id uuid REFERENCES apporteurs_affaires(id);
CREATE INDEX IF NOT EXISTS idx_clients_apporteur ON clients(apporteur_id) WHERE apporteur_id IS NOT NULL;
