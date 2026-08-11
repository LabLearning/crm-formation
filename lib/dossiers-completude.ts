/**
 * Complétude des dossiers de formation, calculée en masse.
 *
 * Reprend exactement les règles de la fiche session — une pièce est présente
 * si le CRM l'a produite ou si son justificatif est déposé — mais sur
 * l'ensemble des sessions, pour pouvoir les traiter dans l'ordre de priorité.
 */
import { fetchAllPaged } from '@/lib/supabase/fetch-all'
import { PIECES } from '@/lib/pieces-session'

export interface DossierSession {
  id: string
  reference: string | null
  intitule: string | null
  date_debut: string
  client: string | null
  nbInscrits: number
  presentes: string[]
  manquantes: string[]
  manquantesMajeures: number
  score: number
}

export async function completudeDossiers(
  supabase: any,
  organizationId: string,
  opts?: { depuis?: string },
): Promise<DossierSession[]> {
  const depuis = opts?.depuis || '2000-01-01'

  const brutes = await fetchAllPaged((from, to) =>
    supabase.from('sessions')
      .select('id, reference, intitule, date_debut, status, client:client_id(raison_sociale, nom_commercial), formation:formation_id(intitule)')
      .eq('organization_id', organizationId)
      .eq('status', 'terminee')
      .gte('date_debut', depuis)
      .order('date_debut', { ascending: false })
      .range(from, to),
  )
  // Les lignes « BPF-… » ont été créées pour faire coller les totaux du bilan
  // pédagogique et financier : ce sont des agrégats, pas des actions de
  // formation. Les compter comme des dossiers incomplets n'a pas de sens.
  const sessions = brutes.filter((s: any) => !String(s.reference || '').startsWith('BPF-'))
  const ids = new Set(sessions.map((s: any) => s.id))

  const [inscriptions, emargements, qcmSessions, qcmReponses, qcms, conventions, contrats, recueils, evalAcquis, docs] =
    await Promise.all([
      fetchAllPaged((f, t) => supabase.from('inscriptions').select('session_id').eq('organization_id', organizationId).not('status', 'in', '("annule","abandonne")').range(f, t)),
      fetchAllPaged((f, t) => supabase.from('emargements').select('session_id, signature_data').eq('organization_id', organizationId).not('signature_data', 'is', null).range(f, t)),
      fetchAllPaged((f, t) => supabase.from('qcm_sessions').select('session_id, qcm_id').range(f, t)),
      fetchAllPaged((f, t) => supabase.from('qcm_reponses').select('session_id, qcm_id, is_complete').eq('organization_id', organizationId).eq('is_complete', true).range(f, t)),
      fetchAllPaged((f, t) => supabase.from('qcm').select('id, type').eq('organization_id', organizationId).range(f, t)),
      fetchAllPaged((f, t) => supabase.from('conventions').select('session_id, signature_client_date').eq('organization_id', organizationId).range(f, t)),
      fetchAllPaged((f, t) => supabase.from('contrats_formateur').select('session_id').eq('organization_id', organizationId).neq('status', 'annule').range(f, t)),
      fetchAllPaged((f, t) => supabase.from('recueils_besoin').select('session_id').eq('organization_id', organizationId).range(f, t)),
      fetchAllPaged((f, t) => supabase.from('evaluations_acquis').select('session_id').eq('organization_id', organizationId).range(f, t)),
      fetchAllPaged((f, t) => supabase.from('documents').select('session_id, type').eq('organization_id', organizationId).not('session_id', 'is', null).range(f, t)),
    ])

  const typeQcm = new Map(qcms.map((q: any) => [q.id, q.type]))
  const ensemble = (rows: any[], filtre?: (r: any) => boolean) => {
    const out = new Set<string>()
    for (const r of rows) if (r.session_id && ids.has(r.session_id) && (!filtre || filtre(r))) out.add(r.session_id)
    return out
  }
  const compte = (rows: any[]) => {
    const m = new Map<string, number>()
    for (const r of rows) if (r.session_id) m.set(r.session_id, (m.get(r.session_id) || 0) + 1)
    return m
  }

  const nbInscrits = compte(inscriptions)
  const aEmargement = ensemble(emargements)
  const aConvention = ensemble(conventions, (c) => !!c.signature_client_date)
  const aContrat = ensemble(contrats)
  const aRecueil = ensemble(recueils)
  const aEvalAcquis = ensemble(evalAcquis)

  // Un questionnaire compte s'il est rattaché à la session ET rempli.
  const qcmParSession = new Map<string, Set<string>>()
  for (const r of qcmReponses) {
    if (!r.session_id || !ids.has(r.session_id)) continue
    const t = typeQcm.get(r.qcm_id)
    if (!t) continue
    if (!qcmParSession.has(r.session_id)) qcmParSession.set(r.session_id, new Set())
    qcmParSession.get(r.session_id)!.add(t as string)
  }
  const aType = (sid: string, types: string[]) => {
    const s = qcmParSession.get(sid)
    return !!s && types.some((t) => s.has(t))
  }

  const docsParSession = new Map<string, Set<string>>()
  for (const d of docs) {
    if (!ids.has(d.session_id)) continue
    if (!docsParSession.has(d.session_id)) docsParSession.set(d.session_id, new Set())
    docsParSession.get(d.session_id)!.add(d.type)
  }

  return sessions.map((s: any) => {
    const natif: Record<string, boolean> = {
      recueil: aRecueil.has(s.id),
      convention: aConvention.has(s.id),
      contrat: aContrat.has(s.id),
      positionnement: aType(s.id, ['positionnement', 'entree']),
      emargement: aEmargement.has(s.id),
      acquis: aType(s.id, ['sortie', 'evaluation']) || aEvalAcquis.has(s.id),
      satisfaction: aType(s.id, ['satisfaction_chaud', 'satisfaction_froid']),
    }
    const justifs = docsParSession.get(s.id) || new Set<string>()

    const presentes: string[] = []
    const manquantes: string[] = []
    for (const p of PIECES) {
      if (natif[p.cle] || justifs.has(p.typeDocument)) presentes.push(p.cle)
      else manquantes.push(p.cle)
    }

    return {
      id: s.id,
      reference: s.reference,
      intitule: s.formation?.intitule || s.intitule,
      date_debut: s.date_debut,
      client: s.client?.raison_sociale || s.client?.nom_commercial || null,
      nbInscrits: nbInscrits.get(s.id) || 0,
      presentes,
      manquantes,
      manquantesMajeures: PIECES.filter((p) => p.majeure && manquantes.includes(p.cle)).length,
      score: presentes.length,
    }
  })
}
