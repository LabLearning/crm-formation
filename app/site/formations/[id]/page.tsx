import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, Monitor, Calendar, ArrowRight, ArrowLeft, CheckCircle2, Target, Users, ListChecks, ClipboardCheck, Accessibility, ShieldCheck, BookOpen, ListView, Bulb } from '../../icons'
import { getPublicFormation } from '@/lib/public-site-data'

export const dynamic = 'force-dynamic'

const MODALITE: Record<string, string> = { presentiel: 'Présentiel', distanciel: 'À distance', mixte: 'Mixte' }

export async function generateMetadata({ params }: { params: { id: string } }) {
  const f = await getPublicFormation(params.id)
  return { title: f ? `${f.intitule} — Lab Learning` : 'Formation — Lab Learning' }
}

function Prose({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <p key={i} className="text-[#57534E] leading-relaxed whitespace-pre-line">{b}</p>
      ))}
    </div>
  )
}

export default async function SiteFormationDetail({ params }: { params: { id: string } }) {
  const f = await getPublicFormation(params.id)
  if (!f) notFound()

  const sections: { Icon: any; title: string; content: React.ReactNode }[] = []
  if (f.public_vise) sections.push({ Icon: Users, title: 'Public visé', content: <Prose text={f.public_vise} /> })
  if (f.prerequis) sections.push({ Icon: ListView, title: 'Prérequis', content: <Prose text={f.prerequis} /> })
  if (f.programme_detaille) sections.push({ Icon: BookOpen, title: 'Programme', content: <Prose text={f.programme_detaille} /> })
  if (f.methodes_pedagogiques) sections.push({ Icon: Bulb, title: 'Méthodes pédagogiques', content: <Prose text={f.methodes_pedagogiques} /> })
  if (f.modalites_evaluation) sections.push({ Icon: ClipboardCheck, title: 'Modalités d’évaluation', content: <Prose text={f.modalites_evaluation} /> })
  if (f.accessibilite_handicap) sections.push({ Icon: Accessibility, title: 'Accessibilité', content: <Prose text={f.accessibilite_handicap} /> })

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#195144]/10">
        <div className="absolute inset-0 -z-10 bg-[#195144]" />
        <div className="absolute inset-0 -z-10 opacity-[0.15]" style={{ background: 'radial-gradient(60% 80% at 80% 0%, #6366F1 0%, transparent 60%)' }} />
        <div className="max-w-4xl mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-12 md:pb-16 text-white">
          <Link href="/site/formations" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Toutes les formations
          </Link>
          {f.categorie && <div className="mt-6 text-xs font-semibold uppercase tracking-wider text-[#8ec9b8]">{f.categorie}</div>}
          <h1 className="mt-2 font-heading font-black text-3xl md:text-5xl tracking-heading text-balance">{f.intitule}</h1>
          {f.sous_titre && <p className="mt-3 text-lg text-white/75 max-w-2xl">{f.sous_titre}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {f.duree_heures ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm"><Clock className="h-4 w-4" />{f.duree_heures} heures</span> : null}
            {f.duree_jours ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm"><Calendar className="h-4 w-4" />{f.duree_jours} jour{f.duree_jours > 1 ? 's' : ''}</span> : null}
            {f.modalite ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm"><Monitor className="h-4 w-4" />{MODALITE[f.modalite] || f.modalite}</span> : null}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm"><ShieldCheck className="h-4 w-4" />Certifié Qualiopi</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-14 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {f.objectifs.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-heading font-bold text-xl text-[#14110F] tracking-heading mb-4"><Target className="h-5 w-5 text-[#195144]" />Objectifs pédagogiques</h2>
              <ul className="space-y-2.5">
                {f.objectifs.map((o, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[#57534E]"><CheckCircle2 className="h-5 w-5 text-[#195144] shrink-0 mt-0.5" /><span>{o}</span></li>
                ))}
              </ul>
            </section>
          )}
          {f.competences_visees.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-heading font-bold text-xl text-[#14110F] tracking-heading mb-4"><ListChecks className="h-5 w-5 text-[#195144]" />Compétences visées</h2>
              <div className="flex flex-wrap gap-2">
                {f.competences_visees.map((c, i) => (
                  <span key={i} className="rounded-full border border-[#195144]/15 bg-[#195144]/5 px-3.5 py-1.5 text-sm text-[#195144]">{c}</span>
                ))}
              </div>
            </section>
          )}
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="flex items-center gap-2 font-heading font-bold text-xl text-[#14110F] tracking-heading mb-4"><s.Icon className="h-5 w-5 text-[#195144]" />{s.title}</h2>
              {s.content}
            </section>
          ))}
        </div>

        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 rounded-3xl border border-[#195144]/10 bg-white p-6">
            <div className="font-heading font-bold text-[#14110F]">Intéressé par cette formation ?</div>
            <p className="mt-1.5 text-sm text-[#57534E]">Nous montons le programme et le financement avec vous.</p>
            <div className="mt-4 space-y-2 text-sm">
              {f.duree_heures ? <div className="flex items-center justify-between"><span className="text-[#78716C]">Durée</span><span className="font-medium text-[#14110F]">{f.duree_heures} h{f.duree_jours ? ` · ${f.duree_jours} j` : ''}</span></div> : null}
              {f.modalite ? <div className="flex items-center justify-between"><span className="text-[#78716C]">Modalité</span><span className="font-medium text-[#14110F]">{MODALITE[f.modalite] || f.modalite}</span></div> : null}
              <div className="flex items-center justify-between"><span className="text-[#78716C]">Financement</span><span className="font-medium text-[#14110F]">OPCO éligible</span></div>
            </div>
            <Link href="/site/contact" className="mt-5 flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full bg-[#195144] text-white text-sm font-semibold hover:bg-[#123f34] transition-colors">
              Demander cette formation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  )
}
