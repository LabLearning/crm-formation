import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { AbsencesList } from './AbsencesList'

export const dynamic = 'force-dynamic'

/**
 * Absences à justifier (indicateur 12) : chaque absence d'une session dont la
 * présence est suivie dans le CRM doit porter son motif.
 *
 * Les sessions où aucune présence n'a jamais été enregistrée sont exclues :
 * leurs lignes ne sont pas des absences, ce sont des présences jamais
 * numérisées (l'émargement papier fait foi) — les traiter en absences
 * fabriquerait 4 000 faux absents.
 */
export default async function AbsencesPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  // Pagination PARALLÈLE : le nombre total est connu d'un count, puis toutes
  // les pages partent ensemble — la table dépasse 60 000 lignes, le chargement
  // séquentiel de tout l'historique rendait la page inutilisable.
  const pagesParalleles = async (base: () => any, colonnes: string) => {
    const { count } = await base().select(colonnes, { count: 'exact', head: true })
    const nb = Math.ceil((count || 0) / 1000)
    const lots = await Promise.all(Array.from({ length: nb }, (_, i) =>
      base().select(colonnes).range(i * 1000, i * 1000 + 999).then((r: any) => r.data || [])))
    return lots.flat()
  }

  // 1) Les absences candidates : non présent, non signé, sans motif — seul
  //    sous-ensemble utile (quelques milliers de lignes, pas 60 000).
  const absencesBrutes = await pagesParalleles(
    () => supabase.from('emargements')
      .eq('organization_id', session.organization.id)
      .or('est_present.is.null,est_present.eq.false')
      .is('signature_data', null)
      .is('motif_absence', null),
    'id, session_id, apprenant_id, date, creneau, apprenant:apprenant_id(prenom, nom)',
  )

  // 2) Les sessions où la présence est réellement suivie (≥ 1 présent ou
  //    1 signature) : colonnes minimales, en parallèle.
  const [presents, signes] = await Promise.all([
    pagesParalleles(
      () => supabase.from('emargements')
        .eq('organization_id', session.organization.id).eq('est_present', true),
      'session_id',
    ),
    pagesParalleles(
      () => supabase.from('emargements')
        .eq('organization_id', session.organization.id).not('signature_data', 'is', null),
      'session_id',
    ),
  ])
  const suivies = new Set([...presents, ...signes].map((r: any) => r.session_id))

  // Les sessions où aucune présence n'a jamais été enregistrée sont exclues :
  // leurs lignes ne sont pas des absences, ce sont des présences jamais
  // numérisées (l'émargement papier fait foi).
  const parSession = new Map<string, any[]>()
  for (const e of absencesBrutes) {
    if (!suivies.has(e.session_id)) continue
    if (!parSession.has(e.session_id)) parSession.set(e.session_id, [])
    parSession.get(e.session_id)!.push(e)
  }
  const sessionsAvecAbsences: { sessionId: string; absences: any[] }[] = []
  for (const [sessionId, absences] of parSession) {
    if (absences.length) sessionsAvecAbsences.push({ sessionId, absences })
  }

  const ids = sessionsAvecAbsences.map((x) => x.sessionId)
  const lotsSessions = await Promise.all(
    Array.from({ length: Math.ceil(ids.length / 200) }, (_, i) =>
      supabase.from('sessions')
        .select('id, reference, date_debut, date_fin, intitule, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial)')
        .in('id', ids.slice(i * 200, i * 200 + 200))
        .then((r) => r.data || [])),
  )
  const sessions = lotsSessions.flat()
  const sessionPar = new Map(sessions.map((s: any) => [s.id, s]))

  const groupes = sessionsAvecAbsences
    .map(({ sessionId, absences }) => {
      const s: any = sessionPar.get(sessionId)
      return {
        sessionId,
        reference: s?.reference || '(sans référence)',
        formation: s?.formation?.intitule || s?.intitule || '',
        client: s?.client?.nom_commercial || s?.client?.raison_sociale || '—',
        dateDebut: s?.date_debut || '',
        absences: absences
          .map((a) => ({
            id: a.id,
            apprenant: `${a.apprenant?.prenom || ''} ${a.apprenant?.nom || ''}`.trim() || 'Stagiaire',
            apprenantId: a.apprenant_id,
            date: a.date,
            creneau: a.creneau,
          }))
          .sort((a, b) => a.apprenant.localeCompare(b.apprenant, 'fr') || String(a.date).localeCompare(String(b.date))),
      }
    })
    .sort((a, b) => String(b.dateDebut).localeCompare(String(a.dateDebut)))

  return (
    <div className="animate-fade-in">
      <AbsencesList groupes={groupes} />
    </div>
  )
}
