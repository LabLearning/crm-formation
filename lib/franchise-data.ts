/**
 * Agrégations de données pour le portail franchise.
 * Tout est scopé par franchise_id + organization_id.
 */

export interface FranchiseStats {
  nbEtablissements: number
  nbEtablissementsFormes: number
  nbDossiers: number
  nbSessions: number
  nbSessionsRealisees: number
  nbParticipants: number
  nbPresences: number
  nbAbsences: number
  tauxPresence: number | null
  caGenere: number
  priseEnChargeTotal: number
  commissionAVenir: number
  commissionValidee: number
  commissionPayee: number
  commissionTotale: number
}

export async function getFranchiseStats(
  supabase: any,
  franchiseId: string,
  orgId: string,
): Promise<FranchiseStats> {
  // Établissements
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('franchise_id', franchiseId)
    .eq('organization_id', orgId)
  const clientIds = (clients || []).map((c: any) => c.id)

  // Dossiers (par franchise_id ou client rattaché)
  const orFilter = clientIds.length
    ? `franchise_id.eq.${franchiseId},client_id.in.(${clientIds.join(',')})`
    : `franchise_id.eq.${franchiseId}`
  const { data: dossiers } = await supabase
    .from('dossiers_formation')
    .select('id, client_id, session_id, status, montant_total_ttc, montant_prise_en_charge, commission_montant, commission_status')
    .eq('organization_id', orgId)
    .or(orFilter)

  const ds = dossiers || []
  const sessionIds = Array.from(new Set(ds.map((d: any) => d.session_id).filter(Boolean)))
  const etablissementsFormes = new Set(ds.map((d: any) => d.client_id).filter(Boolean))

  // Sessions
  let sessions: any[] = []
  if (sessionIds.length) {
    const { data } = await supabase
      .from('sessions')
      .select('id, status')
      .in('id', sessionIds)
    sessions = data || []
  }
  const nbSessionsRealisees = sessions.filter((s) => s.status === 'terminee').length

  // Participants (inscriptions)
  let nbParticipants = 0
  if (sessionIds.length) {
    const { count } = await supabase
      .from('inscriptions')
      .select('id', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .not('status', 'in', '("annule","abandonne")')
    nbParticipants = count || 0
  }

  // Présences / absences (émargements)
  let nbPresences = 0
  let nbAbsences = 0
  if (sessionIds.length) {
    const [{ count: pres }, { count: abs }] = await Promise.all([
      supabase.from('emargements').select('id', { count: 'exact', head: true }).in('session_id', sessionIds).eq('est_present', true),
      supabase.from('emargements').select('id', { count: 'exact', head: true }).in('session_id', sessionIds).eq('est_present', false),
    ])
    nbPresences = pres || 0
    nbAbsences = abs || 0
  }
  const totalEmargements = nbPresences + nbAbsences
  const tauxPresence = totalEmargements > 0 ? Math.round((nbPresences / totalEmargements) * 100) : null

  const sum = (arr: any[], key: string, filter?: (d: any) => boolean) =>
    arr.filter(filter || (() => true)).reduce((s, d) => s + Number(d[key] || 0), 0)

  return {
    nbEtablissements: clientIds.length,
    nbEtablissementsFormes: etablissementsFormes.size,
    nbDossiers: ds.length,
    nbSessions: sessions.length,
    nbSessionsRealisees,
    nbParticipants,
    nbPresences,
    nbAbsences,
    tauxPresence,
    caGenere: sum(ds, 'montant_total_ttc'),
    priseEnChargeTotal: sum(ds, 'montant_prise_en_charge'),
    commissionAVenir: sum(ds, 'commission_montant', (d) => d.commission_status === 'a_venir'),
    commissionValidee: sum(ds, 'commission_montant', (d) => d.commission_status === 'validee'),
    commissionPayee: sum(ds, 'commission_montant', (d) => d.commission_status === 'payee'),
    commissionTotale: sum(ds, 'commission_montant'),
  }
}
