import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export interface Chip { Icon: any; label: string }

export interface ChapterProps {
  index: number
  eyebrow: string
  title: string
  desc: string
  bullets: string[]
  Icon: any
  from: string
  to: string
  chips: Chip[]
  href?: string
  cta?: string
  flip?: boolean
}

/** Section « chapitre » : texte d'un côté, visuel dégradé de l'autre, en alternance. */
export function StoryChapter(p: ChapterProps) {
  const Big = p.Icon
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      {/* Texte */}
      <div className={p.flip ? 'lg:order-2' : ''}>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-heading font-black text-sm tabular-nums text-[#195144]">{String(p.index).padStart(2, '0')}</span>
          <span className="h-px w-8 bg-[#195144]/30" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#195144]">{p.eyebrow}</span>
        </div>
        <h3 className="font-heading font-bold text-2xl md:text-[32px] leading-tight text-[#14110F] tracking-heading text-balance">{p.title}</h3>
        <p className="mt-3 text-lg text-[#57534E] leading-relaxed">{p.desc}</p>
        <ul className="mt-6 space-y-2.5">
          {p.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[#44403C]">
              <CheckCircle2 className="h-5 w-5 text-[#195144] shrink-0 mt-0.5" /><span>{b}</span>
            </li>
          ))}
        </ul>
        {p.href && (
          <Link href={p.href} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#195144] hover:gap-2.5 transition-all">
            {p.cta || 'En savoir plus'} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Visuel */}
      <div className={p.flip ? 'lg:order-1' : ''}>
        <div className="relative rounded-[28px] overflow-hidden aspect-[4/3] ring-1 ring-black/5 shadow-lg shadow-black/5" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
          <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '16px 16px' }} />
          <div className="absolute -right-8 -top-8 text-white/15"><Big className="h-52 w-52" strokeWidth={1} /></div>
          <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm self-start">
              <Big className="h-6 w-6 text-white" />
            </span>
            <div className="flex flex-wrap gap-2">
              {p.chips.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3.5 py-2 text-sm font-medium text-white ring-1 ring-white/20">
                  <c.Icon className="h-4 w-4" /> {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
