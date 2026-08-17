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

  const pages = async (fn: (f: number, t: number) => any) => {
    const out: any[] = []
    for (let f = 0; ; f += 500) {
      const { data, error } = await fn(f, f + 499)
      if (error) throw new Error(error.message)
      out.push(...(data || []))
      if ((data || []).length < 500) break
    }
    return out
  }

  const em = await pages((f, t) => supabase.from('emargements')
    .select('id, session_id, apprenant_id, date, creneau, est_present, motif_absence, signature_data, apprenant:apprenant_id(prenom, nom)')
    .eq('organization_id', session.organization.id).range(f, t))

  const parSession = new Map<string, any[]>()
  for (const e of em) {
    if (!parSession.has(e.session_id)) parSession.set(e.session_id, [])
    parSession.get(e.session_id)!.push(e)
  }

  // Seules les sessions où la présence est réellement suivie portent des
  // absences au sens propre.
  const sessionsAvecAbsences: { sessionId: string; absences: any[] }[] = []
  for (const [sessionId, rows] of parSession) {
    const presents = rows.filter((r) => r.est_present || r.signature_data).length
    if (presents === 0) continue
    const absences = rows.filter((r) => !r.est_present && !r.signature_data && !r.motif_absence)
    if (absences.length) sessionsAvecAbsences.push({ sessionId, absences })
  }

  const ids = sessionsAvecAbsences.map((x) => x.sessionId)
  const sessions = ids.length
    ? await pages((f, t) => supabase.from('sessions')
        .select('id, reference, date_debut, date_fin, intitule, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial)')
        .in('id', ids).range(f, t))
    : []
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
