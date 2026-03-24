#!/bin/bash
# ============================================================
# FormaCRM — Exécution des migrations SQL
# ============================================================
#
# Ce script concatène toutes les migrations en un seul fichier
# à copier-coller dans Supabase Dashboard > SQL Editor
#
# Usage: npm run db:migrate
# ============================================================

set -e

MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"
OUTPUT_FILE="$(dirname "$0")/../supabase/full_migration.sql"

echo "→ Génération du fichier de migration complet..."
echo ""

# Clear output
> "$OUTPUT_FILE"

# Header
cat >> "$OUTPUT_FILE" << 'HEADER'
-- ============================================================
-- FormaCRM — Migration complète
-- Généré automatiquement — Ne pas modifier
-- ============================================================
-- Exécutez ce fichier dans Supabase Dashboard > SQL Editor
-- en une seule fois.
-- ============================================================

HEADER

# Concatenate all migrations in order
for file in "$MIGRATIONS_DIR"/*.sql; do
  filename=$(basename "$file")
  echo "  + $filename"
  echo "" >> "$OUTPUT_FILE"
  echo "-- ============================================================" >> "$OUTPUT_FILE"
  echo "-- MIGRATION: $filename" >> "$OUTPUT_FILE"
  echo "-- ============================================================" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  cat "$file" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
done

# Add post-migration commands
cat >> "$OUTPUT_FILE" << 'FOOTER'

-- ============================================================
-- POST-MIGRATION : Initialisation
-- ============================================================
-- Après avoir créé votre premier compte (Super Admin),
-- exécutez ces commandes pour initialiser les données :
--
-- SELECT seed_qualiopi_indicateurs('VOTRE_ORG_ID');
-- SELECT seed_email_templates('VOTRE_ORG_ID');
--
-- L'org_id est créé automatiquement lors de l'inscription.
-- Vous le trouverez dans la table organizations.
-- ============================================================
FOOTER

TOTAL_LINES=$(wc -l < "$OUTPUT_FILE")
echo ""
echo "→ Migration générée : supabase/full_migration.sql ($TOTAL_LINES lignes)"
echo ""
echo "  Prochaine étape :"
echo "  1. Ouvrez Supabase Dashboard > SQL Editor"
echo "  2. Collez le contenu de supabase/full_migration.sql"
echo "  3. Cliquez sur 'Run'"
echo ""
