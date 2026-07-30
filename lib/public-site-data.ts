import { createServiceRoleClient } from '@/lib/supabase/server'

// Organisation Lab Learning (site vitrine mono-org pour l'instant).
const ORG = process.env.PUBLIC_SITE_ORG || 'ff747dfe-c034-44d8-98d7-e53892263fb5'

const norm = (s: string | null) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

export interface PublicFormation {
  id: string
  intitule: string
  categorie: string | null
  duree_heures: number | null
  modalite: string | null
  objectifs: string[]
}

export interface PublicSiteData {
  stats: { formations: number; apprenants: number; formateurs: number; sessionsRealisees: number; entreprises: number }
  formations: PublicFormation[]
  categories: { nom: string; formations: PublicFormation[] }[]
  franchises: { nom: string; logo_url: string | null; secteur: string | null; nombre_etablissements: number | null }[]
}

/**
 * Données LIVE du CRM pour le site vitrine : catalogue de formations (dédoublonné
 * par intitulé), partenaires franchise, et compteurs temps réel. Chaque formation
 * créée dans le CRM apparaît automatiquement ici.
 */
export async function getPublicSiteData(): Promise<PublicSiteData> {
  const supabase = await createServiceRoleClient()

  const [formationsRes, franchisesRes, apprC, formC, sessC, cliC] = await Promise.all([
    supabase.from('formations')
      .select('id, intitule, categorie, duree_heures, modalite, objectifs_pedagogiques')
      .eq('organization_id', ORG).eq('is_active', true).order('intitule'),
    supabase.from('franchises')
      .select('nom, logo_url, secteur, nombre_etablissements')
      .eq('organization_id', ORG).eq('is_active', true).not('logo_url', 'is', null)
      .order('nombre_etablissements', { ascending: false, nullsFirst: false }),
    supabase.from('apprenants').select('id', { count: 'exact', head: true }).eq('organization_id', ORG),
    supabase.from('formateurs').select('id', { count: 'exact', head: true }).eq('organization_id', ORG).eq('is_active', true),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('organization_id', ORG).eq('status', 'terminee'),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', ORG).eq('type', 'entreprise'),
  ])

  // Dédoublonnage par intitulé normalisé
  const seen = new Set<string>()
  const formations: PublicFormation[] = []
  for (const f of (formationsRes.data || []) as any[]) {
    const k = norm(f.intitule)
    if (!k || seen.has(k)) continue
    seen.add(k)
    formations.push({
      id: f.id, intitule: f.intitule, categorie: f.categorie || null,
      duree_heures: f.duree_heures || null, modalite: f.modalite || null,
      objectifs: Array.isArray(f.objectifs_pedagogiques) ? f.objectifs_pedagogiques.slice(0, 4) : [],
    })
  }

  // Regroupement par catégorie
  const catMap = new Map<string, PublicFormation[]>()
  for (const f of formations) {
    const c = f.categorie || 'Autres formations'
    if (!catMap.has(c)) catMap.set(c, [])
    catMap.get(c)!.push(f)
  }
  const categories = [...catMap.entries()]
    .map(([nom, fs]) => ({ nom, formations: fs }))
    .sort((a, b) => b.formations.length - a.formations.length)

  return {
    stats: {
      formations: formations.length,
      apprenants: apprC.count || 0,
      formateurs: formC.count || 0,
      sessionsRealisees: sessC.count || 0,
      entreprises: cliC.count || 0,
    },
    formations,
    categories,
    franchises: (franchisesRes.data || []) as any[],
  }
}
