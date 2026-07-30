import { metierStyle } from './metier'

/**
 * Bandeau visuel d'une catégorie métier : dégradé + trame + grande icône
 * filigrane. Sert de « visuel » sur les cards sans nécessiter de photo.
 */
export function MetierVisual({ nom, label, className = '', height = 'h-32' }: { nom: string; label?: string; className?: string; height?: string }) {
  const s = metierStyle(nom)
  const Icon = s.Icon
  return (
    <div className={`relative overflow-hidden ${height} ${className}`} style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
      <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '14px 14px' }} />
      <div className="absolute -right-5 -bottom-6 text-white/20">
        <Icon className="h-32 w-32" strokeWidth={1.25} />
      </div>
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </span>
        {label ? <span className="font-heading font-semibold text-white text-lg leading-tight tracking-heading drop-shadow-sm">{label}</span> : null}
      </div>
    </div>
  )
}
