'use client'

interface ProgressRingProps {
  value: number          // 0-100
  size?: number
  stroke?: number
  color?: string         // couleur de l'arc
  trackColor?: string
  label?: string         // texte centre (défaut: pourcentage)
  sublabel?: string
}

/**
 * Anneau de progression SVG (donut). Léger, sans dépendance.
 */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  color = '#6366F1',
  trackColor = '#E7E5E4',
  label,
  sublabel,
}: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading font-bold text-surface-900 leading-none" style={{ fontSize: size * 0.22 }}>
          {label ?? `${Math.round(pct)}%`}
        </span>
        {sublabel && <span className="text-[10px] text-surface-400 mt-1">{sublabel}</span>}
      </div>
    </div>
  )
}
