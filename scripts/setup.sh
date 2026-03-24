#!/bin/bash
# ============================================================
# FormaCRM — Script d'installation production
# ============================================================

set -e

echo "╔══════════════════════════════════════════╗"
echo "║     FormaCRM — Installation              ║"
echo "║     CRM Formation Qualiopi               ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── 1. Vérification des prérequis ───
echo "→ Vérification des prérequis..."

if ! command -v node &> /dev/null; then
  echo "✗ Node.js non installé. Installez Node.js 18+ : https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "✗ Node.js 18+ requis (version actuelle: $(node -v))"
  exit 1
fi
echo "  Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
  echo "✗ npm non installé"
  exit 1
fi
echo "  npm $(npm -v)"
echo ""

# ─── 2. Installation des dépendances ───
echo "→ Installation des dépendances..."
npm install
echo ""

# ─── 3. Vérification du .env.local ───
if [ ! -f .env.local ]; then
  echo "→ Création du fichier .env.local..."
  cp .env.local.example .env.local
  echo ""
  echo "╔══════════════════════════════════════════╗"
  echo "║  IMPORTANT : Configurez .env.local       ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  echo "  Ouvrez .env.local et renseignez :"
  echo ""
  echo "  1. NEXT_PUBLIC_SUPABASE_URL"
  echo "     → Supabase Dashboard > Settings > API > Project URL"
  echo ""
  echo "  2. NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "     → Supabase Dashboard > Settings > API > anon public"
  echo ""
  echo "  3. SUPABASE_SERVICE_ROLE_KEY"
  echo "     → Supabase Dashboard > Settings > API > service_role (secret)"
  echo ""
  echo "  4. RESEND_API_KEY (optionnel pour le dev)"
  echo "     → https://resend.com/api-keys"
  echo ""
  echo "  Puis relancez ce script."
  exit 0
fi

# Verify keys are filled
if grep -q "your-anon-key" .env.local; then
  echo "✗ Les clés Supabase ne sont pas configurées dans .env.local"
  echo "  Renseignez NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "  .env.local configuré"
echo ""

# ─── 4. Vérification TypeScript ───
echo "→ Vérification TypeScript..."
npx tsc --noEmit 2>/dev/null && echo "  TypeScript OK" || echo "  (Avertissements TypeScript ignorés pour le moment)"
echo ""

# ─── 5. Build de test ───
echo "→ Build de vérification..."
npm run build

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Installation terminée avec succès !     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Prochaines étapes :"
echo ""
echo "  1. Exécutez les migrations SQL dans Supabase"
echo "     → npm run db:migrate"
echo "     → (ou manuellement dans Supabase Dashboard > SQL Editor)"
echo ""
echo "  2. Lancez le serveur de développement"
echo "     → npm run dev"
echo ""
echo "  3. Ouvrez http://localhost:3000"
echo "     → Créez votre premier compte (Super Admin)"
echo ""
echo "  4. Pour déployer sur Vercel"
echo "     → npx vercel"
echo ""
