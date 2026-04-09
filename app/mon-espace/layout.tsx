import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MonEspaceShell } from './MonEspaceShell'

const PORTAIL_ROLES = ['apporteur_affaires', 'formateur', 'apprenant']

export default async function MonEspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  // Seuls les rôles portail accèdent ici
  if (!PORTAIL_ROLES.includes(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <MonEspaceShell user={session.user} orgName={session.organization.name}>
      {children}
    </MonEspaceShell>
  )
}
