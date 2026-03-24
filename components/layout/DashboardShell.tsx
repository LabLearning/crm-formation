'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { ToastProvider } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import type { User, Permission } from '@/lib/types'

interface DashboardShellProps {
  user: User
  orgName: string
  permissions: Permission[]
  children: React.ReactNode
}

export function DashboardShell({ user, orgName, permissions, children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-50">
        {/* Sidebar (desktop) */}
        <div className="hidden lg:block">
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
          sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[256px]'
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
