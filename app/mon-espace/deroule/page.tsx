import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveFormateur } from '../_formateur/guard'
import { DPO_VERSION } from '@/lib/dpo'
import { DerouleSignature } from './DerouleSignature'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { formateurId, formateurName } = await resolveFormateur()
  const supabase = await createServiceRoleClient()

  // Table absente avant la migration 119 : la page reste consultable.
  const { data: sig } = await supabase
    .from('dpo_signatures')
    .select('version, signed_at')
    .eq('formateur_id', formateurId)
    .eq('version', DPO_VERSION)
    .maybeSingle()

  return <DerouleSignature formateurName={formateurName} signature={sig || null} />
}
