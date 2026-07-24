-- 088 — Vivier de candidats (sourcing en amont des projets POEI)
-- Une personne source des profils, les qualifie, les rattache à une entreprise
-- et à un projet POEI, puis les valide → création de l'apprenant + du candidat POEI.

CREATE TABLE IF NOT EXISTS candidats_vivier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identité (reprise du modèle apprenant, exigée dans les dossiers de financement)
  civilite text,
  prenom text NOT NULL,
  nom text NOT NULL,
  sexe text,
  email text,
  telephone text,
  date_naissance date,
  lieu_naissance text,
  numero_securite_sociale text,
  adresse text,
  code_postal text,
  ville text,
  type_contrat text,

  -- Sourcing
  source text,                    -- d'où vient le candidat (LinkedIn, France Travail, cooptation…)
  disponibilite text,             -- disponibilité déclarée
  statut text NOT NULL DEFAULT 'nouveau',  -- nouveau|qualifie|presente|retenu|valide|refuse|vivier
  notes text,

  -- Cibles (entreprise pressentie + projet POEI de rattachement)
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  poei_id uuid REFERENCES poei(id) ON DELETE SET NULL,
  poste_vise text,
  identifiant_ft text,

  -- Validation → devient un apprenant rattaché au projet POEI
  apprenant_id uuid REFERENCES apprenants(id) ON DELETE SET NULL,
  valide_at timestamptz,

  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidats_vivier_org ON candidats_vivier(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidats_vivier_statut ON candidats_vivier(organization_id, statut);
CREATE INDEX IF NOT EXISTS idx_candidats_vivier_poei ON candidats_vivier(poei_id);

-- RLS : verrouillé comme le reste (l'app accède en service_role, qui bypasse ;
-- aucun accès anon/authenticated direct) — cohérent avec les migrations 082/083.
ALTER TABLE candidats_vivier ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE candidats_vivier IS 'Vivier de candidats sourcés en amont des projets POEI ; validés → apprenants + poei_candidats.';
