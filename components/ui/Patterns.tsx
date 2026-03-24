'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

// ─── Page Header ───────────────────────────────────────────

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    icon?: React.ReactNode
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    icon?: React.ReactNode
    onClick: () => void
  }
}

export function PageHeader({ title, subtitle, action, secondaryAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">{title}</h1>
        {subtitle && <p className="text-surface-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex gap-2">
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick} icon={secondaryAction.icon}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button onClick={action.onClick} icon={action.icon}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Search Bar ────────────────────────────────────────────

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Rechercher...', className }: SearchBarProps) {
  return (
    <div className={cn('flex items-center gap-2.5 bg-white rounded-xl px-3.5 py-2 border border-surface-200/80 hover:border-surface-300 transition-colors flex-1 max-w-md', className)}>
      <Search className="h-3.5 w-3.5 text-surface-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none flex-1"
      />
      {value && (
        <button onClick={() => onChange('')} className="text-surface-400 hover:text-surface-600 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── Filter Pills ──────────────────────────────────────────

interface FilterPillsProps<T extends string> {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
}

export function FilterPills<T extends string>({ options, value, onChange }: FilterPillsProps<T>) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150',
            value === opt.value
              ? 'bg-surface-900 text-white shadow-xs'
              : 'bg-white text-surface-500 border border-surface-200/80 hover:border-surface-300 hover:text-surface-700'
          )}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span className={cn('ml-1.5', value === opt.value ? 'text-white/60' : 'text-surface-400')}>
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Empty State ───────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-16 px-8">
      <div className="h-12 w-12 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-heading font-semibold text-surface-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-surface-400 max-w-sm">{description}</p>}
      {action && (
        <Button variant="secondary" className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

// ─── Dropdown Menu ─────────────────────────────────────────

interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger' | 'success' | 'brand'
  divider?: boolean
}

interface DropdownMenuProps {
  items: DropdownItem[]
  isOpen: boolean
  onClose: () => void
  align?: 'left' | 'right'
  width?: string
}

const variantClasses: Record<string, string> = {
  default: 'text-surface-600 hover:bg-surface-50 hover:text-surface-800',
  danger: 'text-danger-600 hover:bg-danger-50',
  success: 'text-success-600 hover:bg-success-50',
  brand: 'text-brand-600 hover:bg-brand-50',
}

export function DropdownMenu({ items, isOpen, onClose, align = 'right', width = 'w-48' }: DropdownMenuProps) {
  if (!isOpen) return null

  return (
    <div
      className={cn(
        'absolute top-full mt-1.5 bg-white rounded-xl border border-surface-200 shadow-elevated py-1 z-20 animate-in-scale',
        align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
        width
      )}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="border-t border-surface-100 my-1" />}
          <button
            onClick={() => { item.onClick(); onClose() }}
            className={cn(
              'flex items-center gap-2.5 w-full px-3 py-[7px] text-[13px] font-medium transition-colors',
              variantClasses[item.variant || 'default']
            )}
          >
            {item.icon && <span className="shrink-0 opacity-60">{item.icon}</span>}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Stat Card (for dashboards) ────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  iconBg?: string
  label: string
  value: string | number
  sub?: string
  valueColor?: string
  href?: string
}

export function StatCard({ icon, iconBg = 'bg-surface-100', label, value, sub, valueColor = 'text-surface-900' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={cn('stat-icon', iconBg)}>
        {icon}
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className={cn('stat-value mt-0.5', valueColor)}>{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section Label ─────────────────────────────────────────

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('section-label mb-3', className)}>
      {children}
    </div>
  )
}

// ─── Info Grid (for detail views) ──────────────────────────

interface InfoItemProps {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}

export function InfoGrid({ items, cols = 2 }: { items: InfoItemProps[]; cols?: 2 | 3 | 4 }) {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[cols]

  return (
    <div className={cn('grid gap-3', gridClass)}>
      {items.map((item, i) => (
        <div key={i} className="p-3 rounded-xl bg-surface-50">
          <div className="flex items-center gap-1.5 text-[11px] text-surface-400 mb-0.5">
            {item.icon}
            {item.label}
          </div>
          <div className="text-sm font-medium text-surface-800">{item.value}</div>
        </div>
      ))}
    </div>
  )
}
