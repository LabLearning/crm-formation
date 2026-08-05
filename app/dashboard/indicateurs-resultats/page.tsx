import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchAllPaged } from '@/lib/supabase/fetch-all'
import { ResultatsForm } from './ResultatsForm'

export const dynamic = 'force-dynamic'

export default async function IndicateursResultatsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  // Enregistrement courant (résilient avant migration 106)
  let current: any = null
  let tableReady = true
  {
    const r = await supabase.from('indicateurs_resultats').select('*').eq('organization_id', orgId).maybeSingle()
    if (r.error) tableReady = false
    else current = r.data
  }

  // Réussite calculée depuis les vraies évaluations des acquis
  let reussiteCalc: number | null = null
  let nbEvals = 0
  try {
    const rows = await fetchAllPaged<any>((from, to) =>
      supabase.from('evaluations_acquis').select('note, note_max').eq('organization_id', orgId).range(from, to))
    const noted = rows.filter((r) => r.note != null && r.note_max)
    nbEvals = noted.length
    if (noted.length > 0) {
      const reussis = noted.filter((r) => Number(r.note) >= Number(r.note_max) / 2).length
      reussiteCalc = Math.round((reussis / noted.length) * 100)
    }
  } catch { /* table absente */ }

  // Sessions terminées (suggestion nb_sessions)
  const { count: nbSessionsTerm } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'terminee')

  return (
    <div className="animate-fade-in">
      <ResultatsForm
        current={current}
        tableReady={tableReady}
        reussiteCalc={reussiteCalc}
        nbEvals={nbEvals}
        nbSessionsTerm={nbSessionsTerm || 0}
      />
    </div>
  )
}
