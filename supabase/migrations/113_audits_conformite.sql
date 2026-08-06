-- ============================================================
-- 113 — Audits de conformité (outil commercial /dashboard/audit)
-- L'outil ne stockait rien (état React + localStorage). On persiste
-- chaque audit, rattaché au lead ou au client audité.
-- ============================================================

CREATE TABLE IF NOT EXISTS audits_conformite (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id           uuid REFERENCES leads(id) ON DELETE SET NULL,
  client_id         uuid REFERENCES clients(id) ON DELETE SET NULL,

  -- Établissement audité
  etablissement     text NOT NULL,
  etab_type         text,
  convention        text,
  effectif          integer,
  commercial_nom    text,

  -- Questionnaire : { haccp: { total, formed }, duerp: {...}, sst: {...}, incendie: {...} }
  axes              jsonb NOT NULL DEFAULT '{}'::jsonb,
  duerp_etat        text,               -- oui | partiel | non

  -- Résultat calculé (figé au moment de l'enregistrement)
  score             numeric,            -- /5
  couverture        integer,            -- %

  -- Script commercial
  opco              text,
  compte_actif      text,
  engagement        text,               -- accepte | hesitant | refus
  contact_nom       text,
  contact_email     text,
  contact_telephone text,
  projection_periode text,
  rdv_date          date,
  rdv_heure         text,
  notes             text,

  statut            text NOT NULL DEFAULT 'termine',  -- termine | converti
  created_by        uuid REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audits_conf_org    ON audits_conformite(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audits_conf_lead   ON audits_conformite(lead_id);
CREATE INDEX IF NOT EXISTS idx_audits_conf_client ON audits_conformite(client_id);

ALTER TABLE audits_conformite ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY audits_conformite_org ON audits_conformite
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;
