import { fetchAllPaged } from './supabase/fetch-all'

/** Statuts « à venir » : conservés tels quels tant que la formation n'a pas commencé. */
const A_VENIR = ['planifiee', 'confirmee', 'validee']

/**
 * Statut attendu d'une session d'après ses seules dates.
 * Renvoie null si le statut courant doit être conservé (session à venir, ou annulée).
 */
export function statutAttendu(
  status: string,
  dateDebut: string | null,
  dateFin: string | null,
  today = new Date().toISOString().slice(0, 10),
): string | null {
  if (status === 'annulee') return null           // jamais réactivée automatiquement
  if (!dateDebut) return null                     // sans date, on ne décide rien

  const fin = dateFin || dateDebut

  if (fin < today) return status === 'terminee' ? null : 'terminee'
  if (dateDebut <= today && today <= fin) return status === 'en_cours' ? null : 'en_cours'

  // Formation à venir : on garde le statut métier (planifiée / confirmée / validée).
  // On ne « rembobine » que si elle avait été marquée en cours ou terminée à tort.
  if (A_VENIR.includes(status)) return null
  return 'planifiee'
}

/**
 * Aligne le statut de toutes les sessions de l'organisation sur leurs dates.
 * Idempotent : ne met à jour que ce qui change.
 */
export async function syncSessionStatuts(supabase: any, organizationId?: string) {
  const rows = await fetchAllPaged<any>((from, to) => {
    let q = supabase.from('sessions').select('id, reference, status, date_debut, date_fin')
    if (organizationId) q = q.eq('organization_id', organizationId)
    return q.range(from, to)
  })

  const today = new Date().toISOString().slice(0, 10)
  const changes: { id: string; from: string; to: string }[] = []
  for (const s of rows) {
    const cible = statutAttendu(s.status, s.date_debut, s.date_fin, today)
    if (cible && cible !== s.status) changes.push({ id: s.id, from: s.status, to: cible })
  }

  let updated = 0
  for (const c of changes) {
    const { error } = await supabase.from('sessions').update({ status: c.to }).eq('id', c.id)
    if (!error) updated++
  }

  const parTransition: Record<string, number> = {}
  for (const c of changes) {
    const k = `${c.from} → ${c.to}`
    parTransition[k] = (parTransition[k] || 0) + 1
  }
  return { examinees: rows.length, mises_a_jour: updated, transitions: parTransition }
}
