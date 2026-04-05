'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCog, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { ToastProvider } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/types'
import { stopImpersonationAction } from '@/app/dashboard/users/actions'
import type { User, Permission } from '@/lib/types'

interface DashboardShellProps {
  user: User
  orgName: string
  permissions: Permission[]
  children: React.ReactNode
  impersonatedBy?: User
}

function StopImpersonationButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleStop() {
    setLoading(true)
    await stopImpersonationAction()
    router.push('/dashboard/users')
    router.refresh()
  }

  return (
    <button
      onClick={handleStop}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
    >
      <X className="h-3.5 w-3.5" />
      Retour à mon compte
    </button>
  )
}

export function DashboardShell({ user, orgName, permissions, children, impersonatedBy }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-50">
        {/* Impersonation banner */}
        {impersonatedBy && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span className="text-sm font-medium">
                Mode aperçu — Vous naviguez en tant que{' '}
                <strong>{user.first_name} {user.last_name}</strong>{' '}
                ({ROLE_LABELS[user.role]})
              </span>
            </div>
            <StopImpersonationButton />
          </div>
        )}

        {/* Sidebar (desktop) */}
        <div className={cn('hidden lg:block', impersonatedBy && 'pt-10')}>
          <Sidebar
            permissions={permissions}
            orgName={orgName}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Mobile nav */}
        <MobileNav
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          permissions={permissions}
          orgName={orgName}
        />

        {/* Main content */}
        <div className={cn(
          'transition-all duration-300 ease-out',
          sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[256px]',
          impersonatedBy && 'pt-10'
        )}>
          <Header user={user} onMobileMenuToggle={() => setMobileNavOpen(true)} />
          <main className="p-5 lg:p-7 xl:p-8 max-w-[1440px]">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
