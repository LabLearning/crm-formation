'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export interface DashboardData {
  // Financier
  ca_realise: number
  ca_previsionnel: number
  ca_mois: number
  encaisse: number
  impaye: number
  // Pipeline
  leads_total: number
  leads_par_status: Record<string, number>
  leads_valeur: number
  devis_en_attente: number
  devis_valeur: number
  taux_transformation: number
  // Formation
  sessions_en_cours: number
  sessions_a_venir: number
  sessions_terminees: number
  apprenants_formes: number
  apprenants_en_cours: number
  heures_dispensees: number
  // Qualité
  taux_satisfaction: number
  taux_reussite: number
  reclamations_ouvertes: number
  conformite_qualiopi: number
  // Alertes
  factures_en_retard: number
  documents_en_attente: number
  habilitations_a_renouveler: number
  // Activité récente
  activite_recente: { action: string; entity_type: string; user_name: string; created_at: string }[]
  // Mensuel (12 mois)
  ca_mensuel: { mois: string; montant: number }[]
  inscriptions_mensuelles: { mois: string; count: number }[]
}

export async function getDashboardData(): Promise<DashboardData> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id
  const now = new Date()
  const startOfYear = `${now.getFullYear()}-01-01`
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  // ---- Financier ----
  const { data: factures } = await supabase
    .from('factures')
    .select('montant_ttc, montant_paye, montant_restant, status, date_emission, date_echeance, type')
    .eq('organization_id', orgId)
    .neq('status', 'annulee')
    .neq('type', 'avoir')

  const allFactures = factures || []
  const ca_realise = allFactures.reduce((s, f) => s + Number(f.montant_ttc), 0)
  const ca_mois = allFactures
    .filter((f) => f.date_emission >= startOfMonth)
    .reduce((s, f) => s + Number(f.montant_ttc), 0)
  const encaisse = allFactures.reduce((s, f) => s + Number(f.montant_paye), 0)
  const impaye = allFactures
    .filter((f) => ['emise', 'envoyee', 'payee_partiellement', 'en_retard'].includes(f.status))
    .reduce((s, f) => s + Number(f.montant_restant), 0)
  const factures_en_retard = allFactures
    .filter((f) => ['emise', 'envoyee', 'payee_partiellement'].includes(f.status) && f.date_echeance < today)
    .length

  // CA mensuel (12 derniers mois)
  const ca_mensuel: { mois: string; montant: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const moisStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const montant = allFactures
      .filter((f) => f.date_emission?.startsWith(moisStr))
      .reduce((s, f) => s + Number(f.montant_ttc), 0)
    ca_mensuel.push({
      mois: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      montant,
    })
  }

  // ---- Pipeline ----
  const { data: leads } = await supabase
    .from('leads')
    .select('status, montant_estime')
    .eq('organization_id', orgId)

  const allLeads = leads || []
  const leads_par_status: Record<string, number> = {}
  allLeads.forEach((l) => { leads_par_status[l.status] = (leads_par_status[l.status] || 0) + 1 })
  const leads_valeur = allLeads
    .filter((l) => !['perdu'].includes(l.status))
    .reduce((s, l) => s + (Number(l.montant_estime) || 0), 0)

  const { data: devisData } = await supabase
    .from('devis')
    .select('montant_ttc, status')
    .eq('organization_id', orgId)
    .in('status', ['envoye'])

  const devis_en_attente = devisData?.length || 0
  const devis_valeur = (devisData || []).reduce((s, d) => s + Number(d.montant_ttc), 0)

  const totalLeads = allLeads.length
  const wonLeads = allLeads.filter((l) => l.status === 'gagne').length
  const taux_transformation = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0

  // ---- Formation ----
  const { data: sessionsData } = await supabase
    .from('sessions')
    .select('status, date_debut, date_fin')
    .eq('organization_id', orgId)

  const allSessions = sessionsData || []
  const sessions_en_cours = allSessions.filter((s) => s.status === 'en_cours' || (s.date_debut <= today && s.date_fin >= today && s.status === 'confirmee')).length
  const sessions_a_venir = allSessions.filter((s) => s.date_debut > today && ['planifiee', 'confirmee'].includes(s.status)).length
  const sessions_terminees = allSessions.filter((s) => s.status === 'terminee').length

  const { count: apprenants_formes } = await supabase
    .from('inscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'complete')

  const { count: apprenants_en_cours } = await supabase
    .from('inscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .in('status', ['inscrit', 'confirme', 'en_cours'])

  // Inscriptions mensuelles
  const { data: inscriptionsData } = await supabase
    .from('inscriptions')
    .select('date_inscription')
    .eq('organization_id', orgId)

  const inscriptions_mensuelles: { mois: string; count: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const moisStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const count = (inscriptionsData || []).filter((ins) => ins.date_inscription?.startsWith(moisStr)).length
    inscriptions_mensuelles.push({
      mois: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      count,
    })
  }

  // ---- Qualité ----
  const { data: satisfactions } = await supabase
    .from('evaluations_satisfaction')
    .select('note_moyenne')
    .eq('organization_id', orgId)

  const taux_satisfaction = (satisfactions || []).length > 0
    ? Math.round(((satisfactions || []).reduce((s, e) => s + Number(e.note_moyenne), 0) / (satisfactions || []).length) * 20)
    : 0

  const { data: reponses } = await supabase
    .from('qcm_reponses')
    .select('is_reussi, is_complete')
    .eq('organization_id', orgId)
    .eq('is_complete', true)

  const completedReponses = (reponses || []).filter((r) => r.is_complete)
  const taux_reussite = completedReponses.length > 0
    ? Math.round((completedReponses.filter((r) => r.is_reussi).length / completedReponses.length) * 100)
    : 0

  const { count: reclamations_ouvertes } = await supabase
    .from('reclamations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .neq('status', 'cloturee')

  const { data: qualiopiData } = await supabase
    .from('qualiopi_indicateurs')
    .select('niveau')
    .eq('organization_id', orgId)
    .neq('niveau', 'non_applicable')

  const qualiopiTotal = (qualiopiData || []).length
  const qualiopiConforme = (qualiopiData || []).filter((q) => q.niveau === 'conforme').length
  const conformite_qualiopi = qualiopiTotal > 0 ? Math.round((qualiopiConforme / qualiopiTotal) * 100) : 0

  // ---- Alertes ----
  const { count: habilitations_count } = await supabase
    .from('formateurs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .lt('prochaine_mise_a_jour', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])

  // ---- Activité récente ----
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('action, entity_type, created_at, user:users(first_name, last_name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10)

  const activite_recente = (auditLogs || []).map((log) => ({
    action: log.action,
    entity_type: log.entity_type,
    user_name: log.user ? `${(log.user as any).first_name} ${(log.user as any).last_name}` : 'Système',
    created_at: log.created_at,
  }))

  // CA prévisionnel = devis envoyés + factures en cours
  const ca_previsionnel = ca_realise + devis_valeur

  return {
    ca_realise, ca_previsionnel, ca_mois, encaisse, impaye,
    leads_total: totalLeads, leads_par_status, leads_valeur,
    devis_en_attente, devis_valeur, taux_transformation,
    sessions_en_cours, sessions_a_venir, sessions_terminees,
    apprenants_formes: apprenants_formes || 0, apprenants_en_cours: apprenants_en_cours || 0,
    heures_dispensees: 0,
    taux_satisfaction, taux_reussite,
    reclamations_ouvertes: reclamations_ouvertes || 0, conformite_qualiopi,
    factures_en_retard, documents_en_attente: 0,
    habilitations_a_renouveler: habilitations_count || 0,
    activite_recente,
    ca_mensuel, inscriptions_mensuelles,
  }
}
