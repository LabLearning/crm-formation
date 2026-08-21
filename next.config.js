const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Lecture IA des fiches papier : les photos passent par une Server
    // Action — la limite par défaut (1 Mo) est trop courte pour des photos
    // de téléphone même compressées.
    serverActions: { bodySizeLimit: '8mb' },
    // Cache client du routeur : une page déjà visitée est réaffichée
    // instantanément pendant 60s au lieu de refaire l'aller-retour serveur.
    // Les Server Actions purgent ce cache (revalidatePath), donc les
    // modifications restent visibles immédiatement.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  // Le site vitrine répond sur lab-learning.fr : l'hôte nu (et www) est
  // réécrit vers /site — les liens internes du site étant déjà en /site/…,
  // seule la racine a besoin d'être mappée ; le reste passe tel quel.
  async rewrites() {
    const hosts = ['lab-learning.fr', 'www.lab-learning.fr']
    return {
      beforeFiles: hosts.map((h) => ({
        source: '/',
        has: [{ type: 'host', value: h }],
        destination: '/site',
      })),
    }
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

module.exports = withSentryConfig(nextConfig, {
  // Org / project Sentry — à renseigner via env vars en prod
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Silence le wizard si auth_token manque (build local sans Sentry)
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Upload des sourcemaps pour avoir des stack traces lisibles
  widenClientFileUpload: true,

  // Tunnel : évite les ad-blockers qui bloquent les events Sentry côté navigateur
  tunnelRoute: '/monitoring',

  // Ne pas générer de release ni upload de sourcemaps si pas de SENTRY_AUTH_TOKEN
  disableLogger: true,
  automaticVercelMonitors: false,
})
