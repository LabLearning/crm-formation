import type { MetadataRoute } from 'next'

/**
 * Seul le site vitrine est destiné aux moteurs de recherche. Le reste du
 * domaine — dashboard, portails à token, pages de signature, API — est un
 * espace de travail : l'indexer exposerait des URL privées dans les résultats
 * de recherche.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/site'],
        disallow: [
          '/dashboard',
          '/portail',
          '/mon-espace',
          '/api',
          '/certificat',
          '/convention',
          '/contrat-formateur',
          '/login',
          '/register',
        ],
      },
    ],
    sitemap: 'https://crm.lab-learning.fr/sitemap.xml',
  }
}
