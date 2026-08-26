import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from './icons'

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
  /** Photo terrain : remplace le fond dégradé par l'image teintée + scrim. */
  img?: string
  href?: string
  cta?: string
  flip?: boolean
}

/** Section « chapitre » : texte d'un côté, visuel dégradé de l'autre, en alternance. */
export function StoryChapter(p: ChapterProps) {
  const Big = p.Icon
  const num = String(p.index).padStart(2, '0')
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      {/* Texte */}
      <div className={p.flip ? 'lg:order-2' : ''}>
        <div className="flex items-center gap-4 mb-5">
          <span className="ll-index text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-[#205040] to-[#205040]/25">{num}</span>
          <span className="ll-kicker">{p.eyebrow}</span>
        </div>
        <h3 className="ll-display text-[28px] md:text-[38px] leading-[1.05] text-[#14110F] text-balance">{p.title}</h3>
        <p className="mt-4 text-lg text-[#57534E] leading-relaxed">{p.desc}</p>
        <ul className="mt-6 space-y-2.5">
          {p.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[#44403C]">
              <CheckCircle2 className="h-5 w-5 text-[#205040] shrink-0 mt-0.5" /><span>{b}</span>
            </li>
          ))}
        </ul>
        {p.href && (
          p.href.startsWith('http')
            ? <a href={p.href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#205040] hover:gap-2.5 transition-all">
                {p.cta || 'En savoir plus'} <ArrowRight className="h-4 w-4" />
              </a>
            : <Link href={p.href} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#205040] hover:gap-2.5 transition-all">
                {p.cta || 'En savoir plus'} <ArrowRight className="h-4 w-4" />
              </Link>
        )}
      </div>

      {/* Visuel */}
      <div className={p.flip ? 'lg:order-1' : ''}>
        <div className="group relative rounded-[28px] overflow-hidden aspect-[4/3] ring-1 ring-black/5 shadow-xl shadow-black/10" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
          {p.img ? (
            <>
              {/* Photo terrain teintée aux couleurs du chapitre + scrim bas */}
              <img loading="lazy" src={p.img} alt="" aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(155deg, ${p.from}B3 0%, ${p.to}33 55%, transparent 100%)` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '16px 16px' }} />
              <div className="absolute -right-8 -bottom-10 text-white/12 transition-transform duration-700 group-hover:scale-105"><Big className="h-56 w-56" strokeWidth={1} /></div>
            </>
          )}
          <span className="ll-index absolute right-5 top-1 text-[8rem] md:text-[11rem] leading-none text-white/10 select-none">{num}</span>
          <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/25 self-start">
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
