import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchAllPaged } from '@/lib/supabase/fetch-all'
import { EvaluationsAcquisList } from './EvaluationsAcquisList'

export const dynamic = 'force-dynamic'

export interface EvalAcquisRow {
  id: string
  note: number | null
  note_max: number | null
  appreciation: string | null
  validee: boolean
  date_evaluation: string | null
  apprenant: { prenom: string; nom: string } | null
  session: { reference: string | null; intitule: string | null } | null
  formateur: { prenom: string; nom: string } | null
}

export default async function EvaluationsAcquisPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  // Sonde : la table existe-t-elle (migration 104 appliquée) ?
  const probe = await supabase.from('evaluations_acquis').select('id', { head: true, count: 'exact' }).eq('organization_id', orgId)
  const tableReady = !probe.error

  let rows: EvalAcquisRow[] = []
  if (tableReady) {
    const data = await fetchAllPaged<any>((from, to) =>
      supabase.from('evaluations_acquis')
        .select('id, note, note_max, appreciation, validee, date_evaluation, apprenant:apprenants(prenom,nom), session:sessions(reference,intitule), formateur:formateurs(prenom,nom)')
        .eq('organization_id', orgId)
        .order('date_evaluation', { ascending: false })
        .range(from, to))
    rows = data as EvalAcquisRow[]
  }

  return (
    <div className="animate-fade-in">
      <EvaluationsAcquisList rows={rows} tableReady={tableReady} />
    </div>
  )
}
