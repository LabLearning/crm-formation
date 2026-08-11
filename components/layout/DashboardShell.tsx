'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCog, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { ToastProvider } from '@/components/ui/Toast'
import { ImpersonationBanner } from './ImpersonationBanner'
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


export function DashboardShell({ user, orgName, permissions, children, impersonatedBy }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-50">
        {impersonatedBy && <ImpersonationBanner user={user} />}

        {/* Sidebar (desktop) */}
        <div className={cn('hidden lg:block', impersonatedBy && 'pt-10')}>
          <Sidebar
            permissions={permissions}
            orgName={orgName}
            userRole={user.role}
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
          userRole={user.role}
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
