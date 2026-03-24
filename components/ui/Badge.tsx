import { cn } from '@/lib/utils'
import type { BadgeVariant } from '@/lib/types'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-600 border-surface-200/60',
  success: 'bg-success-50 text-success-700 border-success-100',
  warning: 'bg-warning-50 text-warning-700 border-warning-100',
  danger: 'bg-danger-50 text-danger-700 border-danger-100',
  info: 'bg-brand-50 text-brand-700 border-brand-100',
}

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-400',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-brand-500',
}

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-[2px] text-[11px] font-medium leading-normal',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  )
}
