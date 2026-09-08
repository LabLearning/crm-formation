/**
 * Agrégations de données pour le portail franchise, assises sur les SESSIONS
 * des établissements rattachés (l'unité réelle de l'activité), et sur les
 * commissions par session (commissions_sessions).
 * Tout est scopé par franchise_id + organization_id.
 */

export interface FranchiseStats {
  nbEtablissements: number
  nbEtablissementsFormes: number
  /** Conservé pour compatibilité : = nombre de sessions. */
  nbDossiers: number
  nbSessions: number
  nbSessionsRealisees: number
  nbParticipants: number
  nbPresences: number
  nbAbsences: number
  tauxPresence: number | null
  /** Prise en charge des sessions réalisées (base de calcul des commissions). */
  caGenere: number
  priseEnChargeTotal: number
  commissionAVenir: number
  commissionValidee: number
  commissionPayee: number
  commissionTotale: number
  /** Sessions sans montant renseigné (ni prise en charge OPCO ni prix HT). */
  nbSessionsSansMontant: number
}

async function tout<T = any>(build: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await build(from, from + 999)
    if (!data?.length) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

export async function getFranchiseStats(
  supabase: any,
  franchiseId: string,
  orgId: string,
): Promise<FranchiseStats> {
  // Établissements rattachés
  const { data: clients } = await supabase
    .from('clients').select('id').eq('franchise_id', franchiseId).eq('organization_id', orgId)
  const clientIds = (clients || []).map((c: any) => c.id)

  // Sessions des établissements (hors annulées)
  const sessions = clientIds.length
    ? await tout((f, t) => supabase.from('sessions')
        .select('id, client_id, status, prix_ht, montant_finance_opco')
        .eq('organization_id', orgId).in('client_id', clientIds).neq('status', 'annulee').range(f, t))
    : []
  const sessionIds = sessions.map((s: any) => s.id)
  const realisees = sessions.filter((s: any) => s.status === 'terminee')
  const etablissementsFormes = new Set(sessions.map((s: any) => s.client_id).filter(Boolean))
  const baseDe = (s: any) => (Number(s.montant_finance_opco || 0) > 0 ? Number(s.montant_finance_opco) : Number(s.prix_ht || 0))

  // Participants (inscriptions)
  let nbParticipants = 0
  if (sessionIds.length) {
    const { count } = await supabase
      .from('inscriptions').select('id', { count: 'exact', head: true })
      .in('session_id', sessionIds).not('status', 'in', '("annule","abandonne")')
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

  // Commissions par session : la base y intègre les replis (factures, POEI),
  // c'est donc elle qui fait foi pour la prise en charge affichée.
  const { data: commissions } = await supabase
    .from('commissions_sessions')
    .select('session_id, base_montant, commission_montant, status')
    .eq('organization_id', orgId).eq('franchise_id', franchiseId)
  const cs = ((commissions || []) as any[]).filter((c) => c.status !== 'annulee')
  const somme = (filtre: (c: any) => boolean) => cs.filter(filtre).reduce((s, c) => s + Number(c.commission_montant || 0), 0)
  const statutSession = new Map(sessions.map((s: any) => [s.id, s.status]))
  const baseLigne = new Map(cs.map((c) => [c.session_id, Number(c.base_montant || 0)]))
  // Sessions connues sans ligne (pas encore synchronisées) : base brute de la session
  const baseSession = (s: any) => (baseLigne.has(s.id) ? baseLigne.get(s.id)! : baseDe(s))

  return {
    nbEtablissements: clientIds.length,
    nbEtablissementsFormes: etablissementsFormes.size,
    nbDossiers: sessions.length,
    nbSessions: sessions.length,
    nbSessionsRealisees: realisees.length,
    nbParticipants,
    nbPresences,
    nbAbsences,
    tauxPresence,
    caGenere: realisees.reduce((s: number, x: any) => s + baseSession(x), 0),
    priseEnChargeTotal: sessions.reduce((s: number, x: any) => s + baseSession(x), 0),
    commissionAVenir: somme((c) => c.status === 'a_venir'),
    commissionValidee: somme((c) => c.status === 'validee'),
    commissionPayee: somme((c) => c.status === 'payee'),
    commissionTotale: somme(() => true),
    nbSessionsSansMontant: sessions.filter((s: any) => baseSession(s) <= 0 && (statutSession.get(s.id) !== 'annulee')).length,
  }
}

export interface LigneCommissionSession {
  id: string
  session_id: string
  status: string
  base_montant: number
  base_source: string
  cout_formateur: number
  cout_formateur_manuel: number | null
  commission_montant: number
  commission_taux: number
  commission_type: string
  payee_at: string | null
  client: { id: string; raison_sociale: string } | null
  session: {
    id: string; reference: string | null; intitule: string | null
    date_debut: string | null; date_fin: string | null; status: string
    formation: { intitule: string } | null
  } | null
}

/** Les lignes de commission d'une franchise, session par session, les plus récentes d'abord. */
export async function getFranchiseCommissionLines(supabase: any, franchiseId: string, orgId: string): Promise<LigneCommissionSession[]> {
  const { data } = await supabase
    .from('commissions_sessions')
    .select(`
      id, session_id, status, base_montant, base_source, cout_formateur, cout_formateur_manuel,
      commission_montant, commission_taux, commission_type, payee_at,
      client:client_id(id, raison_sociale),
      session:session_id(id, reference, intitule, date_debut, date_fin, status, formation:formation_id(intitule))
    `)
    .eq('organization_id', orgId).eq('franchise_id', franchiseId)
  const lignes = ((data || []) as any[]).map((l) => ({
    ...l,
    client: Array.isArray(l.client) ? l.client[0] || null : l.client,
    session: Array.isArray(l.session) ? l.session[0] || null : l.session,
  }))
  return lignes.sort((a, b) => String(b.session?.date_debut || '').localeCompare(String(a.session?.date_debut || '')))
}
