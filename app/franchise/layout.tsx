import { getFranchiseSession, franchiseDisplayName } from '@/lib/franchise-auth'
import { FranchiseShell } from './FranchiseShell'

export const dynamic = 'force-dynamic'

export default async function FranchiseLayout({ children }: { children: React.ReactNode }) {
  const { user, franchise, organization } = await getFranchiseSession()

  return (
    <FranchiseShell
      user={user}
      franchiseName={franchiseDisplayName(franchise)}
      franchiseLogo={franchise.logo_url}
      orgName={organization.name}
    >
      {children}
    </FranchiseShell>
  )
}
