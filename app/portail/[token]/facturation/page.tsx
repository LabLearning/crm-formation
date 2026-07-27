import { getPortalContext } from '@/lib/portal-auth'
import { redirect } from 'next/navigation'
import { FacturationView } from '@/app/mon-espace/_formateur/FacturationView'

export const dynamic = 'force-dynamic'

export default async function PortalFacturationPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'formateur') redirect('/portail/expired')
  return <FacturationView formateurId={context.formateur.id} token={params.token} />
}
