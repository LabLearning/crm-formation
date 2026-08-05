import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchAllPaged } from '@/lib/supabase/fetch-all'
import { BRANCHES_BASE } from '@/lib/branches'
import { VivierList } from './VivierList'

export const dynamic = 'force-dynamic'

export interface VivierFormateur {
  id: string
  prenom: string
  nom: string
  email: string | null
  telephone: string | null
  whatsapp: string | null
  note_moyenne: number | null
  zone_intervention: string | null
  formateur_secours: boolean
  branches: string[]
  nb_sessions: number
}

export default async function VivierPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  // Formateurs actifs (résilient si la colonne formateur_secours n'existe pas encore)
  const cols = 'id, prenom, nom, email, telephone, whatsapp, note_moyenne, zone_intervention'
  let formateurs: any[] = []
  const r = await supabase.from('formateurs').select(`${cols}, formateur_secours`).eq('organization_id', orgId).eq('is_active', true).order('nom')
  if (r.error) {
    const r2 = await supabase.from('formateurs').select(cols).eq('organization_id', orgId).eq('is_active', true).order('nom')
    formateurs = (r2.data || []).map((f: any) => ({ ...f, formateur_secours: false }))
  } else {
    formateurs = r.data || []
  }

  // Domaines prouvés = branches des formations réellement animées (historique)
  const { data: formations } = await supabase.from('formations').select('id, branches').eq('organization_id', orgId)
  const foBranches = new Map<string, string[]>((formations || []).map((f: any) => [f.id, Array.isArray(f.branches) ? f.branches : []]))

  const sessions = await fetchAllPaged<any>((from, to) =>
    supabase.from('sessions').select('formateur_id, formation_id').eq('organization_id', orgId).not('formateur_id', 'is', null).range(from, to),
  )

  const branchesByFormateur = new Map<string, Set<string>>()
  const countByFormateur = new Map<string, number>()
  for (const s of sessions) {
    if (!s.formateur_id) continue
    countByFormateur.set(s.formateur_id, (countByFormateur.get(s.formateur_id) || 0) + 1)
    const brs = foBranches.get(s.formation_id) || []
    if (!branchesByFormateur.has(s.formateur_id)) branchesByFormateur.set(s.formateur_id, new Set())
    const set = branchesByFormateur.get(s.formateur_id)!
    for (const b of brs) set.add(b)
  }

  const enriched: VivierFormateur[] = formateurs.map((f) => ({
    id: f.id, prenom: f.prenom, nom: f.nom, email: f.email, telephone: f.telephone, whatsapp: f.whatsapp,
    note_moyenne: f.note_moyenne, zone_intervention: f.zone_intervention,
    formateur_secours: !!f.formateur_secours,
    branches: Array.from(branchesByFormateur.get(f.id) || []),
    nb_sessions: countByFormateur.get(f.id) || 0,
  }))
  // Tri : secours d'abord, puis les plus expérimentés
  enriched.sort((a, b) => Number(b.formateur_secours) - Number(a.formateur_secours) || b.nb_sessions - a.nb_sessions)

  const branchesMeta = BRANCHES_BASE.map((b) => ({ slug: b.slug, label: b.label }))

  return (
    <div className="animate-fade-in">
      <VivierList formateurs={enriched} branchesMeta={branchesMeta} />
    </div>
  )
}
