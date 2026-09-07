-- Planning de travail des candidats POEI : un enregistrement par candidat et
-- par jour, avec deux créneaux (service en coupure) ou un jour de repos.
CREATE TABLE IF NOT EXISTS poei_plannings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  poei_id uuid NOT NULL REFERENCES poei(id) ON DELETE CASCADE,
  candidat_id uuid NOT NULL REFERENCES poei_candidats(id) ON DELETE CASCADE,
  date date NOT NULL,
  repos boolean NOT NULL DEFAULT false,
  creneau1_debut time,
  creneau1_fin time,
  creneau2_debut time,
  creneau2_fin time,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidat_id, date)
);

CREATE INDEX IF NOT EXISTS idx_poei_plannings_poei ON poei_plannings(poei_id);
CREATE INDEX IF NOT EXISTS idx_poei_plannings_candidat ON poei_plannings(candidat_id, date);

ALTER TABLE poei_plannings ENABLE ROW LEVEL SECURITY;
