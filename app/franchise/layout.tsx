import { getFranchiseSession, franchiseDisplayName } from '@/lib/franchise-auth'
import { FranchiseShell } from './FranchiseShell'

export const dynamic = 'force-dynamic'

export default async function FranchiseLayout({ children }: { children: React.ReactNode }) {
  const { user, franchise, organization, impersonatedBy } = await getFranchiseSession()

  return (
    <FranchiseShell
      user={user}
      franchiseName={franchiseDisplayName(franchise)}
      franchiseLogo={franchise.logo_url}
      orgName={organization.name}
      isImpersonating={!!impersonatedBy}
    >
      {children}
    </FranchiseShell>
  )
}
