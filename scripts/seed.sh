#!/bin/bash
# ============================================================
# FormaCRM — Seed des données initiales
# ============================================================
# À exécuter APRÈS la création du premier compte Super Admin
# dans Supabase Dashboard > SQL Editor
# ============================================================

echo "╔══════════════════════════════════════════╗"
echo "║  FormaCRM — Seed des données             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Après avoir créé votre premier compte sur l'application,"
echo "  exécutez le SQL suivant dans Supabase Dashboard > SQL Editor :"
echo ""
echo "  ─────────────────────────────────────────"

cat << 'SEEDSQL'

-- 1. Récupérez votre organization_id
SELECT id, name FROM organizations;

-- 2. Copiez l'id et remplacez ci-dessous
-- Exemple : DO $$ BEGIN PERFORM seed_qualiopi_indicateurs('abc-123-def'); END $$;

DO $$
DECLARE
  org_id UUID;
BEGIN
  -- Prend la première (et souvent seule) organisation
  SELECT id INTO org_id FROM organizations LIMIT 1;

  IF org_id IS NULL THEN
    RAISE NOTICE 'Aucune organisation trouvée. Créez d''abord un compte.';
    RETURN;
  END IF;

  -- Initialiser les 32 indicateurs Qualiopi
  PERFORM seed_qualiopi_indicateurs(org_id);
  RAISE NOTICE 'Indicateurs Qualiopi initialisés pour org %', org_id;

  -- Initialiser les 9 templates email
  PERFORM seed_email_templates(org_id);
  RAISE NOTICE 'Templates email initialisés pour org %', org_id;
END $$;

SEEDSQL

echo ""
echo "  ─────────────────────────────────────────"
echo ""
echo "  Ce script initialise :"
echo "  - 32 indicateurs Qualiopi (7 critères)"
echo "  - 9 templates email (devis, convention, convocation...)"
echo ""
