import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { completudeDossiers } from '@/lib/dossiers-completude'
import { DossiersClient } from './DossiersClient'

export const dynamic = 'force-dynamic'

export default async function DossiersPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  // Deux ans en arrière : au-delà, l'auditeur ne remonte pas sur une surveillance.
  const depuis = new Date()
  depuis.setFullYear(depuis.getFullYear() - 2)

  const dossiers = await completudeDossiers(supabase, session.organization.id, {
    depuis: depuis.toISOString().slice(0, 10),
  })

  return <DossiersClient dossiers={dossiers} />
}
