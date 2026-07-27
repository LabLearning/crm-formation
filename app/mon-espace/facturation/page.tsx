import { resolveFormateur } from '../_formateur/guard'
import { FacturationView } from '../_formateur/FacturationView'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { formateurId, token } = await resolveFormateur()
  return <FacturationView formateurId={formateurId} token={token} />
}
