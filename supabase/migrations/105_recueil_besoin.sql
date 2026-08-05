-- ============================================================
-- 105 — Recueil du besoin (indicateur Qualiopi 4)
-- Modèles par thème (hygiène / prévention-sécurité / management /
-- cœur de métier) + un recueil rempli par session.
-- ============================================================

CREATE TABLE IF NOT EXISTS recueil_besoin_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  theme            text NOT NULL,             -- hygiene | prevention | management | metier
  nom              text NOT NULL,
  questions        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{id,label,type,options?}]
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recueils_besoin (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id       uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  template_id      uuid REFERENCES recueil_besoin_templates(id) ON DELETE SET NULL,
  theme            text,
  reponses         jsonb NOT NULL DEFAULT '{}'::jsonb,
  statut           text NOT NULL DEFAULT 'brouillon',  -- brouillon | complete
  rempli_par       uuid REFERENCES users(id),
  date_recueil     date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_recueil_tpl_org  ON recueil_besoin_templates(organization_id, theme);
CREATE INDEX IF NOT EXISTS idx_recueils_org     ON recueils_besoin(organization_id);
CREATE INDEX IF NOT EXISTS idx_recueils_session ON recueils_besoin(session_id);

ALTER TABLE recueil_besoin_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recueils_besoin ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY recueil_tpl_org ON recueil_besoin_templates
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY recueils_org ON recueils_besoin
    USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Seed des 4 modèles par thème (pour chaque organisation, si aucun modèle) ──
DO $$
DECLARE
  org RECORD;
  common jsonb := '[
    {"id":"contexte","label":"Contexte et activité de l''entreprise / du commanditaire"},
    {"id":"participants","label":"Nombre et profil des participants (postes, ancienneté)"},
    {"id":"niveau","label":"Niveau initial constaté et prérequis"},
    {"id":"objectifs","label":"Objectifs et résultats attendus par le commanditaire"},
    {"id":"contraintes","label":"Contraintes (dates, lieu, modalité, organisation)"},
    {"id":"handicap","label":"Besoins d''adaptation (situation de handicap, langue, autres)"},
    {"id":"attentes","label":"Attentes spécifiques et points de vigilance"}
  ]'::jsonb;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    IF NOT EXISTS (SELECT 1 FROM recueil_besoin_templates WHERE organization_id = org.id) THEN
      INSERT INTO recueil_besoin_templates (organization_id, theme, nom, questions) VALUES
        (org.id, 'hygiene', 'Recueil du besoin — Hygiène & sécurité alimentaire',
          common || '[{"id":"hy_process","label":"Type d''établissement, process et PMS/HACCP en place ; non-conformités récentes ?"}]'::jsonb),
        (org.id, 'prevention', 'Recueil du besoin — Prévention & sécurité au travail',
          common || '[{"id":"pv_risques","label":"Risques professionnels identifiés (DUERP à jour ?), équipements et EPI concernés"}]'::jsonb),
        (org.id, 'management', 'Recueil du besoin — Management, gestion & performance',
          common || '[{"id":"mg_equipe","label":"Taille de l''équipe encadrée et enjeux managériaux (turnover, conflits, performance)"}]'::jsonb),
        (org.id, 'metier', 'Recueil du besoin — Cœur de métier',
          common || '[{"id":"me_gestes","label":"Techniques et gestes métier ciblés ; niveau de maîtrise actuel"}]'::jsonb);
    END IF;
  END LOOP;
END $$;
