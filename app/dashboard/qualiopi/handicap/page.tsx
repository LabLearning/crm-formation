import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ReseauHandicapClient } from './ReseauHandicapClient'

export const dynamic = 'force-dynamic'

/**
 * Réseau handicap (ind. 26) : la liste actualisée des contacts par région
 * (RHF Agefiph, Cap emploi, MDPH), tenue par le référent handicap — chaque
 * ligne porte sa date de dernière vérification.
 */
export default async function ReseauHandicapPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  let contacts: any[] = []
  let tableAbsente = false
  try {
    const { data, error } = await supabase.from('reseau_handicap')
      .select('*').eq('organization_id', session.organization.id)
      .order('region').order('organisme')
    if (error) tableAbsente = true
    else contacts = data || []
  } catch { tableAbsente = true }

  const { data: org } = await supabase.from('organizations')
    .select('referent_handicap_nom, referent_handicap_email, referent_handicap_telephone')
    .eq('id', session.organization.id).single()

  return <ReseauHandicapClient contacts={contacts} tableAbsente={tableAbsente} referent={org as any} />
}
