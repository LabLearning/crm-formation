import { getSession } from '@/lib/auth'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, organization, permissions } = await getSession()

  return (
    <DashboardShell
      user={user}
      orgName={organization.name}
      permissions={permissions}
    >
      {children}
    </DashboardShell>
  )
}
