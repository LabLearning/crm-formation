import { dendreoList, dendreoConfigured } from './dendreo'
import { fetchAllPaged } from './supabase/fetch-all'

interface SyncResult { success: boolean; imported: number; skipped: number; unmatched: number; error?: string }

/**
 * Importe les évaluations des acquis notées par les formateurs depuis Dendreo
 * vers la table evaluations_acquis. Idempotent (upsert sur dendreo_key).
 * Une entrée Dendreo (id_lmp) porte un tableau `evaluations[]` : on aplatit.
 */
export async function importEvaluationsAcquis(supabase: any, orgId: string): Promise<SyncResult> {
  if (!dendreoConfigured()) return { success: false, imported: 0, skipped: 0, unmatched: 0, error: 'Connecteur Dendreo non configuré' }

  let raw: any[]
  try {
    raw = await dendreoList('evaluations', { per_page: 5000 })
  } catch (e: any) {
    return { success: false, imported: 0, skipped: 0, unmatched: 0, error: `Dendreo: ${String(e?.message || e).slice(0, 120)}` }
  }

  // Maps dendreo_id (string) → uuid CRM
  const mapOf = async (table: string) => {
    const rows = await fetchAllPaged<any>((from, to) =>
      supabase.from(table).select('id, dendreo_id').eq('organization_id', orgId).not('dendreo_id', 'is', null).range(from, to))
    return new Map(rows.map((r) => [String(r.dendreo_id), r.id]))
  }
  const [appMap, sessMap, formMap, formateurMap] = await Promise.all([
    mapOf('apprenants'), mapOf('sessions'), mapOf('formations'), mapOf('formateurs'),
  ])

  const rows: any[] = []
  let unmatched = 0
  for (const rec of raw || []) {
    const apprenant_id = appMap.get(String(rec.id_participant)) || null
    const session_id = sessMap.get(String(rec.id_action_de_formation)) || null
    const formation_id = formMap.get(String(rec.id_module)) || null
    const evals = Array.isArray(rec.evaluations) ? rec.evaluations : []
    for (const ev of evals) {
      if (ev.deleted_at) continue // évaluation supprimée côté Dendreo
      const note = ev.note != null && ev.note !== '' ? Number(ev.note) : null
      if (note == null) continue // pas de note → rien à tracer
      const formateur_id = ev.evaluator_type && /Formateur/.test(ev.evaluator_type) ? (formateurMap.get(String(ev.evaluator_id)) || null) : null
      if (!apprenant_id && !session_id) unmatched++
      rows.push({
        organization_id: orgId,
        apprenant_id, session_id, formation_id, formateur_id,
        note,
        note_max: ev.amplitude_notation != null && ev.amplitude_notation !== '' ? Number(ev.amplitude_notation) : 20,
        appreciation: ev.appreciation || null,
        validee: String(ev.validated) === '1',
        date_evaluation: (ev.created_at || '').slice(0, 10) || null,
        source: 'dendreo',
        dendreo_key: `${rec.id_lmp}:${ev.evaluation_set_id || ''}:${ev.evaluator_id || ''}:${ev.created_at || ''}`,
      })
    }
  }

  if (rows.length === 0) return { success: true, imported: 0, skipped: 0, unmatched }

  // Upsert par lots (idempotent sur (organization_id, dendreo_key))
  let imported = 0
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error, count } = await supabase.from('evaluations_acquis')
      .upsert(chunk, { onConflict: 'organization_id,dendreo_key', count: 'exact', ignoreDuplicates: false })
    if (error) return { success: false, imported, skipped: 0, unmatched, error: error.message.slice(0, 150) }
    imported += count ?? chunk.length
  }

  return { success: true, imported, skipped: 0, unmatched }
}
