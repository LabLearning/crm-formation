import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  firstName: string
  lastName: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
  xl: 'h-14 w-14 text-base',
}

// Refined, muted color palette — no bright/childish colors
const bgColors = [
  'bg-surface-200 text-surface-600',
  'bg-brand-100 text-brand-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
  'bg-stone-200 text-stone-600',
]

function getColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % bgColors.length
}

export function Avatar({ firstName, lastName, src, size = 'md', className }: AvatarProps) {
  const initials = getInitials(firstName, lastName)
  const colorClass = bgColors[getColorIndex(`${firstName}${lastName}`)]

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold shrink-0 tracking-tight',
        sizes[size],
        colorClass,
        className
      )}
    >
      {initials}
    </div>
  )
}
