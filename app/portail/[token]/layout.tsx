import { redirect } from 'next/navigation'
import { getPortalContext } from '@/lib/portal-auth'
import { PortalShell } from './PortalShell'

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { token: string }
}) {
  const context = await getPortalContext(params.token)

  if (!context) {
    redirect('/portail/expired')
  }

  return (
    <PortalShell context={context}>
      {children}
    </PortalShell>
  )
}
