-- ============================================================
-- 114 — Synchronisation AuditHygiène Pro → CRM
-- L'outil terrain (projet Supabase ytvpdvgsesulxojztzll) reste la source de
-- vérité. On maintient ici des tables MIROIR en lecture, rattachées aux
-- clients du CRM. `source_id` = identifiant dans l'outil source (idempotence).
-- Preuves utiles côté Qualiopi : besoin identifié (ind. 4) et suivi.
-- ============================================================

-- ── Établissements audités ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ah_etablissements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id         uuid NOT NULL,
  nom               text NOT NULL,
  type_etab         text,
  adresse           text,
  code_postal       text,
  ville             text,
  contact           text,
  tel               text,
  email             text,
  siret             text,
  latitude          numeric,
  longitude         numeric,
  -- Rapprochement avec le CRM
  client_id         uuid REFERENCES clients(id) ON DELETE SET NULL,
  match_methode     text,               -- siren | nom_ville | nom | manuel | null
  match_valide_par  uuid REFERENCES users(id),
  match_valide_at   timestamptz,
  ignore_rapprochement boolean NOT NULL DEFAULT false,
  source_created_at timestamptz,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_ah_etab_client ON ah_etablissements(client_id);
CREATE INDEX IF NOT EXISTS idx_ah_etab_org    ON ah_etablissements(organization_id);

-- ── Audits hygiène ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ah_audits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id         uuid NOT NULL,
  etablissement_id  uuid REFERENCES ah_etablissements(id) ON DELETE CASCADE,
  num_rapport       text,
  date_audit        date,
  heure_debut       text,
  heure_fin         text,
  type_audit        text,               -- Premier audit | Audit de suivi | Audit de sortie
  formateur_nom     text,
  score_global      numeric,
  mention           text,               -- SATISFAISANT | A AMELIORER | INSUFFISANT
  nb_conformes      integer,
  nb_partiels       integer,
  nb_non_conformes  integer,
  personnes_presentes text,
  obs_bilan         text,
  obs_actions       text,
  obs_reco          text,
  obs_next          text,
  obs_delai         text,
  statut            text,               -- brouillon | en_cours | finalise | envoye
  email_envoye_at   timestamptz,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_ah_audits_etab ON ah_audits(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_ah_audits_date ON ah_audits(organization_id, date_audit DESC);

-- ── DUERP ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ah_duerps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id         uuid NOT NULL,
  etablissement_id  uuid REFERENCES ah_etablissements(id) ON DELETE CASCADE,
  num_document      text,
  date_evaluation   date,
  formateur_nom     text,
  effectif          integer,
  statut            text,
  raison_sociale    text,
  enseigne          text,
  activite          text,
  dirigeant_signataire text,
  preventeur        text,
  perimetre         text,
  version_int       integer,
  nb_unites         integer NOT NULL DEFAULT 0,
  nb_risques        integer NOT NULL DEFAULT 0,
  nb_actions        integer NOT NULL DEFAULT 0,
  risques_critiques integer NOT NULL DEFAULT 0,   -- gravité × probabilité >= 9
  email_envoye_at   timestamptz,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_ah_duerps_etab ON ah_duerps(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_ah_duerps_date ON ah_duerps(organization_id, date_evaluation DESC);

-- ── Plan d'action DUERP ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ah_duerp_actions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id         uuid NOT NULL,
  duerp_id          uuid REFERENCES ah_duerps(id) ON DELETE CASCADE,
  description       text,
  responsable       text,
  echeance          date,
  statut            text,               -- a_faire | en_cours | realise | annule
  cout_estime       numeric,
  source_created_at timestamptz,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_ah_actions_duerp ON ah_duerp_actions(duerp_id);

-- ── Journal des synchronisations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ah_syncs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  demarre_at        timestamptz NOT NULL DEFAULT now(),
  termine_at        timestamptz,
  succes            boolean,
  erreur            text,
  resume            jsonb NOT NULL DEFAULT '{}'::jsonb,
  lance_par         uuid REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ah_syncs_org ON ah_syncs(organization_id, demarre_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE ah_etablissements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ah_audits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ah_duerps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ah_duerp_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ah_syncs           ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ah_etablissements','ah_audits','ah_duerps','ah_duerp_actions','ah_syncs'] LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))',
        t || '_org', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
