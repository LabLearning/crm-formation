import type { MetadataRoute } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

const BASE = 'https://crm.lab-learning.fr'
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'

/**
 * Plan du site vitrine : les pages fixes, les quatre branches et chaque fiche
 * formation active. Les fiches portent leur vraie date de mise à jour — c'est
 * elle qui dit aux moteurs quoi re-crawler.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixes: MetadataRoute.Sitemap = [
    { url: `${BASE}/site`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/site/formations`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/site/financements`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/site/resultats`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/site/partenaires`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/site/a-propos`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/site/contact`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${BASE}/site/recrutement`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/site/reclamation`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/site/reglement-interieur`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/site/mentions-legales`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${BASE}/site/cgv`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${BASE}/site/confidentialite`, changeFrequency: 'yearly', priority: 0.1 },
  ]

  const branches = ['restauration-rapide', 'restaurant-hcr', 'boucherie-charcuterie', 'boulangerie-patisserie']
    .map((slug) => ({ url: `${BASE}/site/branches/${slug}`, changeFrequency: 'weekly' as const, priority: 0.8 }))

  let formations: MetadataRoute.Sitemap = []
  try {
    const supabase = await createServiceRoleClient()
    const { data } = await supabase.from('formations')
      .select('id, date_derniere_maj, updated_at')
      .eq('organization_id', ORG).eq('is_active', true).limit(500)
    formations = (data || []).map((f: any) => ({
      url: `${BASE}/site/formations/${f.id}`,
      lastModified: f.date_derniere_maj || f.updated_at || undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch {
    // Sans base joignable, le plan reste utile avec les pages fixes.
  }

  return [...fixes, ...branches, ...formations]
}
