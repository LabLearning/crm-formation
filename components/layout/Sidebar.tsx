'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, UserPlus, Building2, Users, Handshake, FileText,
  GraduationCap, Calendar, UserCheck, Presentation, FileSignature,
  FolderOpen, PenTool, Receipt, CreditCard, ClipboardCheck, ListChecks,
  ShieldCheck, MessageSquareWarning, BarChart3, Shield, Settings, Globe,
  Calculator, ClipboardList, Send, CalendarDays, Mails, PieChart, Layers,
  ChevronDown, PanelLeftClose, PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasAnyPermission } from '@/lib/permissions'
import type { Permission, CRMModule } from '@/lib/types'
import { navigation } from '@/lib/navigation'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, UserPlus, Building2, Users, Handshake, FileText,
  GraduationCap, Calendar, UserCheck, Presentation, FileSignature,
  FolderOpen, PenTool, Receipt, CreditCard, ClipboardCheck, ListChecks,
  ShieldCheck, MessageSquareWarning, BarChart3, Shield, Settings, Globe,
  Calculator, ClipboardList, Send, CalendarDays, Mails, PieChart, Layers,
}

// Section colors: colored title + subtle tinted bg on items
const SEC: Record<string, {
  titleColor: string; itemsBg: string; activeBg: string; activeText: string; hoverBg: string
}> = {
  'G\u00e9n\u00e9ral': { titleColor: 'text-surface-600', itemsBg: '', activeBg: 'bg-surface-900', activeText: 'text-white', hoverBg: 'hover:bg-surface-50' },
  'Commercial': { titleColor: 'text-blue-600', itemsBg: 'bg-blue-50/40', activeBg: 'bg-blue-600', activeText: 'text-white', hoverBg: 'hover:bg-blue-50/60' },
  'Outils': { titleColor: 'text-violet-600', itemsBg: 'bg-violet-50/40', activeBg: 'bg-violet-600', activeText: 'text-white', hoverBg: 'hover:bg-violet-50/60' },
  'Formations': { titleColor: 'text-emerald-600', itemsBg: 'bg-emerald-50/40', activeBg: 'bg-emerald-600', activeText: 'text-white', hoverBg: 'hover:bg-emerald-50/60' },
  'Administratif': { titleColor: 'text-amber-600', itemsBg: 'bg-amber-50/40', activeBg: 'bg-amber-600', activeText: 'text-white', hoverBg: 'hover:bg-amber-50/60' },
  'Finances': { titleColor: 'text-rose-600', itemsBg: 'bg-rose-50/40', activeBg: 'bg-rose-600', activeText: 'text-white', hoverBg: 'hover:bg-rose-50/60' },
  'Qualit\u00e9': { titleColor: 'text-teal-600', itemsBg: 'bg-teal-50/40', activeBg: 'bg-teal-600', activeText: 'text-white', hoverBg: 'hover:bg-teal-50/60' },
  'Syst\u00e8me': { titleColor: 'text-slate-500', itemsBg: '', activeBg: 'bg-slate-700', activeText: 'text-white', hoverBg: 'hover:bg-slate-50' },
}
const DEF = SEC['G\u00e9n\u00e9ral']

interface SidebarProps { permissions: Permission[]; orgName: string; userRole: string; collapsed: boolean; onToggle: () => void }

export function Sidebar({ permissions, orgName, userRole, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(navigation.map(s => [s.title, true]))
  )
  const toggleSection = (title: string) => setOpenSections(prev => ({ ...prev, [title]: !prev[title] }))
  const isActive = (href: string) => href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  const isVisible = (item: { module?: CRMModule; hideForRoles?: string[] }) => {
    if (item.hideForRoles?.includes(userRole)) return false
    return !item.module || hasAnyPermission(permissions, item.module)
  }

  return (
    <aside className={cn('fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-white border-r border-surface-200/60 transition-all duration-300 ease-out', collapsed ? 'w-[68px]' : 'w-[260px]')}>
      {/* Logo */}
      <div className={cn('flex items-center h-[60px] border-b border-surface-100 shrink-0 px-4', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="h-9 w-9 rounded-xl bg-surface-900 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        {!collapsed && <div className="min-w-0"><div className="text-sm font-heading font-bold text-surface-900 tracking-tight truncate">FormaCRM</div><div className="text-[0.625rem] text-surface-400 truncate">{orgName}</div></div>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navigation.map(section => {
          const visibleItems = section.items.filter(item => isVisible(item))
          if (visibleItems.length === 0) return null
          const c = SEC[section.title] || DEF

          return (
            <div key={section.title}>
              {/* Section title - colored */}
              {!collapsed && (
                <button onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-3 pt-3.5 pb-1 group">
                  <span className={cn('text-[0.6875rem] font-bold uppercase tracking-[0.08em]', c.titleColor)}>
                    {section.title}
                  </span>
                  <ChevronDown className={cn('h-3 w-3 transition-transform duration-200 text-surface-300 group-hover:text-surface-400', !openSections[section.title] && '-rotate-90')} />
                </button>
              )}

              {collapsed && <div className="my-2 mx-3 border-t border-surface-100" />}

              {/* Items with subtle tinted background */}
              {(collapsed || openSections[section.title]) && (
                <div className={cn('rounded-xl mt-0.5', !collapsed && c.itemsBg && 'mx-1 px-1 py-1 ' + c.itemsBg)}>
                  <div className="space-y-[2px]">
                    {visibleItems.map(item => {
                      const Icon = iconMap[item.icon]
                      const active = isActive(item.href)
                      return (
                        <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg transition-all duration-150',
                            collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-2.5 py-[7px]',
                            active
                              ? cn(c.activeBg, c.activeText, 'shadow-sm')
                              : cn('text-surface-600', c.hoverBg)
                          )}>
                          {Icon && <Icon className={cn('shrink-0', collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4', active ? 'text-white' : 'text-surface-400')} />}
                          {!collapsed && <span className={cn('text-[13px] font-medium truncate', active ? 'text-white' : 'text-surface-600')}>{item.label}</span>}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse */}
      <div className="shrink-0 border-t border-surface-100 p-2.5">
        <button onClick={onToggle}
          className={cn('flex items-center gap-2.5 w-full rounded-xl px-2.5 py-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors', collapsed && 'justify-center px-0')}>
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /><span className="text-[13px]">Reduire</span></>}
        </button>
      </div>
    </aside>
  )
}
