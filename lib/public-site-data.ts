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

import { buildBranches, BRANCHES_BASE, type BrancheFormationInput, type BrancheGroup } from '@/lib/branches'

export interface BrancheData {
  slug: string
  label: string
  tagline: string
  total: number
  groups: BrancheGroup<PublicFormation>[]
}

/**
 * Catalogue réparti par branche métier. Utilise les vrais champs
 * (branches/est_transverse/site_publie) dès que la migration 099 est appliquée,
 * sinon retombe sur le classifieur par mots-clés — le site marche dans les deux cas.
 */
export async function getBranchesData(): Promise<BrancheData[]> {
  const supabase = await createServiceRoleClient()
  const base = 'id, intitule, categorie, duree_heures, modalite, objectifs_pedagogiques'
  let rows: any[] | null = null
  // Tente les colonnes branche ; si absentes (avant migration), on refait sans.
  const withCols = await supabase.from('formations')
    .select(`${base}, branches, est_transverse, site_publie`)
    .eq('organization_id', ORG).eq('is_active', true).order('intitule')
  if (withCols.error) {
    const basic = await supabase.from('formations')
      .select(base).eq('organization_id', ORG).eq('is_active', true).order('intitule')
    rows = basic.data || []
  } else {
    rows = withCols.data || []
  }

  // Dédoublonnage par intitulé normalisé
  const seen = new Set<string>()
  const formations: (PublicFormation & BrancheFormationInput)[] = []
  for (const f of rows) {
    const k = norm(f.intitule)
    if (!k || seen.has(k)) continue
    seen.add(k)
    formations.push({
      id: f.id, intitule: f.intitule, categorie: f.categorie || null,
      duree_heures: f.duree_heures || null, modalite: f.modalite || null,
      objectifs: Array.isArray(f.objectifs_pedagogiques) ? f.objectifs_pedagogiques.slice(0, 4) : [],
      branches: f.branches, est_transverse: f.est_transverse, site_publie: f.site_publie,
    })
  }

  const map = buildBranches(formations)
  return BRANCHES_BASE.map((b) => {
    const groups = (map.get(b.slug) || []) as BrancheGroup<PublicFormation>[]
    return { slug: b.slug, label: b.label, tagline: b.tagline, total: groups.reduce((s, g) => s + g.formations.length, 0), groups }
  })
}

export interface PublicFormationDetail extends PublicFormation {
  sous_titre: string | null
  public_vise: string | null
  prerequis: string | null
  programme_detaille: string | null
  methodes_pedagogiques: string | null
  modalites_evaluation: string | null
  accessibilite_handicap: string | null
  competences_visees: string[]
  duree_jours: number | null
}

/** Détail public d'une formation (par id). */
export async function getPublicFormation(id: string): Promise<PublicFormationDetail | null> {
  const supabase = await createServiceRoleClient()
  const { data: f } = await supabase.from('formations')
    .select('id, intitule, sous_titre, categorie, duree_heures, duree_jours, modalite, objectifs_pedagogiques, competences_visees, public_vise, prerequis, programme_detaille, methodes_pedagogiques, modalites_evaluation, accessibilite_handicap')
    .eq('id', id).eq('organization_id', ORG).eq('is_active', true).maybeSingle()
  if (!f) return null
  return {
    id: (f as any).id, intitule: (f as any).intitule, sous_titre: (f as any).sous_titre || null,
    categorie: (f as any).categorie || null, duree_heures: (f as any).duree_heures || null,
    duree_jours: (f as any).duree_jours || null, modalite: (f as any).modalite || null,
    objectifs: Array.isArray((f as any).objectifs_pedagogiques) ? (f as any).objectifs_pedagogiques : [],
    competences_visees: Array.isArray((f as any).competences_visees) ? (f as any).competences_visees : [],
    public_vise: (f as any).public_vise || null, prerequis: (f as any).prerequis || null,
    programme_detaille: (f as any).programme_detaille || null,
    methodes_pedagogiques: (f as any).methodes_pedagogiques || null,
    modalites_evaluation: (f as any).modalites_evaluation || null,
    accessibilite_handicap: (f as any).accessibilite_handicap || null,
  }
}

export interface PublicPartner {
  nom: string
  logo_url: string | null
  secteur: string | null
  ville: string | null
  zone_geographique: string | null
  nombre_etablissements: number | null
  etablissements_accompagnes: number
}

/** Partenaires franchise pour la page « Partenaires » (avec comptage réel des établissements liés). */
export async function getPublicPartners(): Promise<PublicPartner[]> {
  const supabase = await createServiceRoleClient()
  const { data: franchises } = await supabase.from('franchises')
    .select('id, nom, logo_url, secteur, ville, zone_geographique, nombre_etablissements')
    .eq('organization_id', ORG).eq('is_active', true)
    .order('nombre_etablissements', { ascending: false, nullsFirst: false })

  const rows = (franchises || []) as any[]
  // Comptage des établissements réellement rattachés (clients.franchise_id)
  const counts = await Promise.all(rows.map((f) =>
    supabase.from('clients').select('id', { count: 'exact', head: true })
      .eq('organization_id', ORG).eq('franchise_id', f.id)
      .then((r) => r.count || 0)
  ))

  return rows.map((f, i) => ({
    nom: f.nom, logo_url: f.logo_url || null, secteur: f.secteur || null,
    ville: f.ville || null, zone_geographique: f.zone_geographique || null,
    nombre_etablissements: f.nombre_etablissements ?? null,
    etablissements_accompagnes: counts[i],
  }))
}

export interface PublicFormateur {
  id: string
  prenom: string
  nom: string
  photo_url: string | null
  domaines_expertise: string[]
  certifications: string[]
  note_moyenne: number | null
  zone_intervention: string | null
}

/**
 * Équipe formateurs pour la page publique « Notre équipe ». N'expose JAMAIS
 * les coordonnées (email/téléphone/SIRET) — uniquement l'identité pro.
 */
export async function getPublicTeam(): Promise<PublicFormateur[]> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('formateurs')
    .select('id, prenom, nom, photo_url, domaines_expertise, certifications, note_moyenne, zone_intervention')
    .eq('organization_id', ORG).eq('is_active', true)
    .order('note_moyenne', { ascending: false, nullsFirst: false })
  return ((data || []) as any[]).map((f) => ({
    id: f.id, prenom: f.prenom || '', nom: f.nom || '',
    photo_url: f.photo_url || null,
    domaines_expertise: Array.isArray(f.domaines_expertise) ? f.domaines_expertise : [],
    certifications: Array.isArray(f.certifications) ? f.certifications : [],
    note_moyenne: f.note_moyenne != null ? Number(f.note_moyenne) : null,
    zone_intervention: f.zone_intervention || null,
  }))
}

/** Indicateurs de résultats publiés (indicateur Qualiopi 2). Null si non publiés. */
export async function getPublicResultats(): Promise<any | null> {
  try {
    const supabase = await createServiceRoleClient()
    const { data, error } = await supabase.from('indicateurs_resultats').select('*').eq('organization_id', ORG).eq('publie', true).maybeSingle()
    if (error) return null
    return data || null
  } catch { return null }
}
