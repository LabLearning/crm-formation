'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList, ShieldAlert, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, ChevronLeft, RotateCcw, Building2, Users, Flame,
  HeartPulse, FileWarning, ArrowRight, ArrowLeft, Phone, Mail,
  Calendar, MessageSquare, Eye, UserPlus, Link2, CircleDot,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

// ── CONFIG ──

const WEIGHTS: Record<string, number> = { haccp: 40, duerp: 20, sst: 20, incendie: 20 }
const LABELS: Record<string, string> = { haccp: 'HACCP', duerp: 'DUERP', sst: 'SST', incendie: 'Incendie' }
const COLORS: Record<string, string> = { haccp: '#EF4444', duerp: '#F59E0B', sst: '#10B981', incendie: '#DC2626' }
const ICONS: Record<string, React.ReactNode> = {
  haccp: <Flame className="h-4 w-4" />,
  duerp: <FileWarning className="h-4 w-4" />,
  sst: <HeartPulse className="h-4 w-4" />,
  incendie: <ShieldAlert className="h-4 w-4" />,
}
const LEGAL: Record<string, { level: string; text: string }> = {
  haccp: { level: 'Obligation lgale (ERP)', text: 'Au moins 1 personne formee HACCP obligatoire. Risques : amende 1 500 EUR, fermeture administrative.' },
  duerp: { level: 'Obligation legale', text: 'DUERP obligatoire des 1 salarie, mise a jour annuelle. Risques : amende 3 000 EUR en recidive.' },
  sst: { level: 'Recommande / Obligatoire', text: 'Recommande pour tous, obligatoire des 20 salaries ou activites a risque.' },
  incendie: { level: 'Obligation ERP', text: 'Formation evacuation et extincteurs obligatoire en ERP. Risques : fermeture par commission securite.' },
}

interface AxeData { total: string; formed: string; linked: boolean }
type Phase = 'questionnaire' | 'script' | 'rapport'
type StepId = number | '3a' | '3b' | '6a' | '6b' | '6c'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export default function AuditConformitePage() {
  const [phase, setPhase] = useState<Phase>('questionnaire')

  // Questionnaire
  const [etabNom, setEtabNom] = useState('')
  const [etabType, setEtabType] = useState('')
  const [convention, setConvention] = useState('')
  const [effectif, setEffectif] = useState('')
  const [commercialNom, setCommercialNom] = useState('')
  const [formations, setFormations] = useState<Record<string, AxeData>>({
    haccp: { total: '', formed: '', linked: true },
    duerp: { total: '', formed: '', linked: true },
    sst: { total: '', formed: '', linked: true },
    incendie: { total: '', formed: '', linked: true },
  })
  const [duerpState, setDuerpState] = useState('')

  // Script
  const [step, setStep] = useState<StepId>(1)
  const [stepHistory, setStepHistory] = useState<StepId[]>([1])
  const [opcoKnown, setOpcoKnown] = useState<string | null>(null)
  const [compteActif, setCompteActif] = useState<string | null>(null)
  const [engagement, setEngagement] = useState<string | null>(null)
  const [contactNom, setContactNom] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactTel, setContactTel] = useState('')
  const [projectionPeriode, setProjectionPeriode] = useState('')
  const [rdvDate, setRdvDate] = useState('')
  const [rdvHeure, setRdvHeure] = useState('')
  const [quickNotes, setQuickNotes] = useState('')
  const [hesitantAction, setHesitantAction] = useState('')
  const [refusRaison, setRefusRaison] = useState('')

  // Prefill
  useEffect(() => {
    try {
      const pf = localStorage.getItem('ll_prefill_audit')
      if (pf) {
        const d = JSON.parse(pf)
        if (d.etabNom) setEtabNom(d.etabNom)
        if (d.etabType) setEtabType(d.etabType)
        if (d.convention) setConvention(d.convention)
        if (d.effectif) setEffectif(String(d.effectif))
        if (d.contactNom) setContactNom(d.contactNom)
        if (d.contactEmail) setContactEmail(d.contactEmail)
        if (d.contactTel) setContactTel(d.contactTel)
        localStorage.removeItem('ll_prefill_audit')
      }
    } catch {}
  }, [])

  // Sync effectif
  useEffect(() => {
    const eff = parseInt(effectif) || 0
    if (eff > 0) {
      setFormations(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(k => {
          if (next[k].linked) next[k] = { ...next[k], total: String(eff) }
        })
        return next
      })
    }
  }, [effectif])

  function updateFormation(key: string, field: keyof AxeData, value: string) {
    setFormations(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }
  function toggleLink(key: string) {
    const linked = !formations[key].linked
    const eff = parseInt(effectif) || 0
    setFormations(prev => ({ ...prev, [key]: { ...prev[key], linked, total: linked && eff ? String(eff) : prev[key].total } }))
  }

  // Score calculation
  const scoreData = useMemo(() => {
    let sectionsWithTotal = 0, sumWeighted = 0
    const pcts: Record<string, number | null> = {}
    const criticals: { k: string; pct: number; msg: string; priority: string }[] = []

    ;['haccp', 'duerp', 'sst', 'incendie'].forEach(k => {
      const t = parseInt(formations[k].total) || 0
      const f = parseInt(formations[k].formed) || 0
      if (t > 0) {
        sectionsWithTotal++
        let pct = clamp(Math.round((f / t) * 100), 0, 100)
        if (k === 'duerp') {
          if (duerpState === 'non') pct = 0
          else if (duerpState === 'partiel') pct = Math.round(pct / 2)
        }
        pcts[k] = pct
        sumWeighted += (pct / 100) * WEIGHTS[k]
        if (k === 'haccp' && f < 1) criticals.push({ k, pct, msg: 'Au moins 1 personne formee HACCP obligatoire', priority: 'high' })
        if (pct < 40) criticals.push({ k, pct, msg: 'Couverture ' + LABELS[k] + ' tres faible (' + pct + '%)', priority: 'high' })
        else if (pct < 70) criticals.push({ k, pct, msg: 'Couverture ' + LABELS[k] + ' moyenne (' + pct + '%)', priority: 'medium' })
      } else { pcts[k] = null }
    })

    const score = sectionsWithTotal > 0 ? Math.round((sumWeighted / 100) * 5 * 10) / 10 : 0
    const coverage = sectionsWithTotal > 0 ? Math.round(sumWeighted) : 0
    criticals.sort((a, b) => (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0))
    return { score, coverage, pcts, criticals }
  }, [formations, duerpState])

  const scoreColor = (s: number) => s >= 4 ? '#10B981' : s >= 3 ? '#F59E0B' : s >= 2 ? '#F97316' : '#EF4444'
  const covColor = (p: number | null) => p === null ? 'text-surface-400' : p >= 80 ? 'text-success-600' : p >= 50 ? 'text-warning-600' : 'text-danger-600'
  const covBg = (p: number | null) => p === null ? 'bg-surface-100' : p >= 80 ? 'bg-success-500' : p >= 50 ? 'bg-warning-500' : 'bg-danger-500'
  const covStatus = (p: number | null) => p === null ? 'Non renseigne' : p >= 80 ? 'Conforme' : p >= 50 ? 'A ameliorer' : 'Non conforme'

  // Script navigation
  function goToStep(s: StepId) { setStepHistory(prev => [...prev, s]); setStep(s) }
  function goBack() { if (stepHistory.length > 1) { const h = [...stepHistory]; h.pop(); setStep(h[h.length - 1]); setStepHistory(h) } }

  // Lacunes
  const lacunes = useMemo(() => {
    return ['haccp', 'duerp', 'sst', 'incendie'].filter(k => {
      const p = scoreData.pcts[k]; return p !== null && p < 80
    }).map(k => {
      const t = parseInt(formations[k].total) || 0
      const f = parseInt(formations[k].formed) || 0
      return { k, label: LABELS[k], manquants: Math.max(0, t - f), pct: scoreData.pcts[k] as number }
    })
  }, [scoreData, formations])

  function handleReset() {
    setPhase('questionnaire'); setEtabNom(''); setEtabType(''); setConvention(''); setEffectif('')
    setFormations({ haccp: { total: '', formed: '', linked: true }, duerp: { total: '', formed: '', linked: true }, sst: { total: '', formed: '', linked: true }, incendie: { total: '', formed: '', linked: true } })
    setDuerpState(''); setStep(1); setStepHistory([1]); setOpcoKnown(null); setCompteActif(null); setEngagement(null)
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Audit de Conformite</h1>
          <p className="text-surface-500 mt-1 text-sm">Diagnostic reglementaire en 3 phases</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset} icon={<RotateCcw className="h-4 w-4" />}>Reinitialiser</Button>
        </div>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-0.5 w-fit">
        {([
          { id: 'questionnaire' as const, label: '1. Questionnaire' },
          { id: 'script' as const, label: '2. Script commercial' },
          { id: 'rapport' as const, label: '3. Rapport' },
        ]).map(p => (
          <button key={p.id} onClick={() => setPhase(p.id)}
            className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors', phase === p.id ? 'bg-white shadow-xs text-surface-900' : 'text-surface-500 hover:text-surface-700')}>
            {p.label}
          </button>
        ))}
      </div>

      {/* ═══ PHASE 1 : QUESTIONNAIRE ═══ */}
      {phase === 'questionnaire' && (
        <div className="space-y-5">
          {/* Etablissement */}
          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-surface-100 flex items-center justify-center"><Building2 className="h-4 w-4 text-surface-600" /></div>
              <span className="text-sm font-heading font-semibold text-surface-900 tracking-tight">Etablissement</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Nom</label><input className="input-base" value={etabNom} onChange={e => setEtabNom(e.target.value)} placeholder="Nom" /></div>
              <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Type</label>
                <select className="input-base" value={etabType} onChange={e => setEtabType(e.target.value)}>
                  <option value="">Selectionner...</option>
                  <option value="Restaurant">Restaurant</option><option value="Boulangerie">Boulangerie</option>
                  <option value="Patisserie">Patisserie</option><option value="Boucherie">Boucherie</option>
                  <option value="Hotel">Hotel</option><option value="Traiteur">Traiteur</option><option value="Autre">Autre</option>
                </select></div>
              <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Effectif</label><input className="input-base" type="number" value={effectif} onChange={e => setEffectif(e.target.value)} placeholder="Nombre" min={0} /></div>
              <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Commercial</label><input className="input-base" value={commercialNom} onChange={e => setCommercialNom(e.target.value)} placeholder="Votre nom" /></div>
            </div>
          </div>

          {/* 4 Axes */}
          {['haccp', 'duerp', 'sst', 'incendie'].map(axe => (
            <div key={axe} className="card p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: COLORS[axe] + '15' }}>
                  <span style={{ color: COLORS[axe] }}>{ICONS[axe]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-heading font-semibold text-surface-900 tracking-tight">{LABELS[axe]}</span>
                    <Badge variant={axe === 'haccp' || axe === 'incendie' ? 'danger' : axe === 'duerp' ? 'warning' : 'success'}>{LEGAL[axe].level}</Badge>
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">{LEGAL[axe].text}</p>
                </div>
              </div>

              {axe === 'duerp' ? (
                <div>
                  <label className="text-xs font-medium text-surface-500 mb-2 block">Le DUERP existe-t-il ?</label>
                  <div className="flex gap-2">
                    {[{ value: 'oui', label: 'Oui, a jour' }, { value: 'partiel', label: 'Oui, pas a jour' }, { value: 'non', label: 'Non' }].map(opt => (
                      <button key={opt.value} onClick={() => setDuerpState(opt.value)}
                        className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all', duerpState === opt.value ? 'bg-surface-900 text-white' : 'bg-surface-50 text-surface-600 hover:bg-surface-100')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Effectif concerne</label><input className="input-base text-center" type="number" value={formations.duerp.total} onChange={e => updateFormation('duerp', 'total', e.target.value)} placeholder="0" min={0} /></div>
                    <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Deja formes</label><input className="input-base text-center" type="number" value={formations.duerp.formed} onChange={e => updateFormation('duerp', 'formed', e.target.value)} placeholder="0" min={0} /></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-surface-500">Effectif concerne</label>
                      <button onClick={() => toggleLink(axe)} className={cn('text-[10px] px-1.5 py-0.5 rounded', formations[axe].linked ? 'bg-brand-50 text-brand-600' : 'bg-surface-100 text-surface-400')}>
                        <Link2 className="h-3 w-3 inline mr-0.5" />{formations[axe].linked ? 'Lie' : 'Libre'}
                      </button>
                    </div>
                    <input className="input-base text-center" type="number" value={formations[axe].total} onChange={e => updateFormation(axe, 'total', e.target.value)} placeholder="0" min={0} disabled={formations[axe].linked} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-500 mb-1.5 block">Deja formes</label>
                    <input className="input-base text-center" type="number" value={formations[axe].formed} onChange={e => updateFormation(axe, 'formed', e.target.value)} placeholder="0" min={0} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Contact */}
          <div className="card p-5">
            <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-3">Contact</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Nom</label><input className="input-base" value={contactNom} onChange={e => setContactNom(e.target.value)} placeholder="Nom" /></div>
              <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Email</label><input className="input-base" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="email@..." /></div>
              <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Telephone</label><input className="input-base" value={contactTel} onChange={e => setContactTel(e.target.value)} placeholder="06..." /></div>
            </div>
          </div>

          <Button onClick={() => setPhase('script')} icon={<ArrowRight className="h-4 w-4" />}>Passer au script commercial</Button>
        </div>
      )}

      {/* ═══ PHASE 2 : SCRIPT COMMERCIAL ═══ */}
      {phase === 'script' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            {/* Score resume */}
            <div className="card p-4 text-center">
              <div className="text-xs text-surface-400 mb-1">Score</div>
              <div className="text-3xl font-heading font-bold" style={{ color: scoreColor(scoreData.score) }}>{scoreData.score > 0 ? scoreData.score.toFixed(1) : '--'}<span className="text-sm text-surface-400">/5</span></div>
              <div className="h-2 rounded-full bg-surface-100 mt-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(scoreData.score / 5) * 100}%`, backgroundColor: scoreColor(scoreData.score) }} />
              </div>
              {etabNom && <div className="text-xs text-surface-500 mt-2">{etabNom}</div>}
            </div>

            {/* Progress steps */}
            <div className="card p-4">
              <div className="text-xs font-semibold text-surface-500 mb-3">Progression</div>
              {[{ id: 1, label: 'Introduction' }, { id: 2, label: 'Budget OPCO' }, { id: 3, label: 'Verification' }, { id: 4, label: 'Accompagnement' }, { id: 5, label: 'Projection' }, { id: 6, label: 'Engagement' }].map(s => {
                const curNum = typeof step === 'number' ? step : parseInt(String(step))
                const isActive = s.id === curNum || String(step).startsWith(String(s.id))
                const isDone = stepHistory.some(h => (typeof h === 'number' ? h : parseInt(String(h))) > s.id)
                return (
                  <div key={s.id} onClick={() => { if (isDone || s.id === 1) goToStep(s.id) }}
                    className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-1 cursor-pointer transition-colors',
                      isActive ? 'bg-brand-50/50 ring-1 ring-brand-200' : 'hover:bg-surface-50')}>
                    <div className={cn('h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0',
                      isActive ? 'bg-surface-900 text-white' : isDone ? 'bg-success-100 text-success-700' : 'bg-surface-100 text-surface-400')}>
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.id}
                    </div>
                    <span className={cn('text-xs font-medium', isActive ? 'text-surface-900' : isDone ? 'text-surface-500' : 'text-surface-400')}>{s.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Quick notes */}
            <div className="card p-4">
              <div className="text-xs font-semibold text-surface-500 mb-2">Notes rapides</div>
              <textarea className="input-base text-sm resize-none" rows={4} value={quickNotes} onChange={e => setQuickNotes(e.target.value)} placeholder="Observations..." />
            </div>
          </div>

          {/* Script area */}
          <div className="lg:col-span-3">
            {/* Progress bar */}
            <div className="flex gap-1 mb-5">
              {[1, 2, 3, 4, 5, 6].map(i => {
                const curNum = typeof step === 'number' ? step : parseInt(String(step))
                const isActive = i === curNum || String(step).startsWith(String(i))
                const isDone = stepHistory.some(s => (typeof s === 'number' ? s : parseInt(String(s))) >= i) && !isActive
                return <div key={i} className={cn('flex-1 h-1.5 rounded-full transition-colors', isActive ? 'bg-brand-600' : isDone ? 'bg-brand-200' : 'bg-surface-100')} />
              })}
            </div>

            {/* STEP 1: Introduction */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="card p-5">
                  <div className="text-[11px] text-brand-600 font-semibold mb-3">ETAPE 1/6 - ANALYSE DU QUESTIONNAIRE</div>
                  {/* Score + 4 axes */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {['haccp', 'duerp', 'sst', 'incendie'].map(k => (
                      <div key={k} className="p-3 rounded-xl bg-surface-50 text-center">
                        <div className="text-[11px] text-surface-400 mb-1">{LABELS[k]}</div>
                        <div className={cn('text-xl font-heading font-bold', covColor(scoreData.pcts[k]))}>{scoreData.pcts[k] !== null ? scoreData.pcts[k] + '%' : '--'}</div>
                      </div>
                    ))}
                  </div>
                  {/* Preconisations */}
                  {scoreData.criticals.length > 0 && (
                    <div className="p-4 rounded-xl bg-danger-50/50 border border-danger-100 mb-4">
                      <div className="text-xs font-semibold text-danger-700 mb-2">Preconisations prioritaires</div>
                      {scoreData.criticals.slice(0, 4).map((c, i) => (
                        <div key={i} className="text-sm text-surface-600 py-0.5">
                          <AlertTriangle className={cn('h-3 w-3 inline mr-1', c.priority === 'high' ? 'text-danger-500' : 'text-warning-500')} />
                          <strong className="text-surface-800">{LABELS[c.k]}</strong> -- {c.msg}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Actions */}
                  <div className="p-4 rounded-xl bg-brand-50/30 border border-brand-100">
                    <div className="text-xs font-semibold text-brand-700 mb-2">Actions a effectuer</div>
                    {lacunes.map(l => (
                      <div key={l.k} className="text-sm text-surface-600 py-0.5">
                        <ArrowRight className="h-3 w-3 inline mr-1 text-brand-500" />
                        Former <strong className="text-surface-800">{l.manquants} personne(s)</strong> en {l.label}
                      </div>
                    ))}
                    {duerpState === 'non' && <div className="text-sm text-surface-600 py-0.5"><ArrowRight className="h-3 w-3 inline mr-1 text-brand-500" />Etablir le <strong className="text-surface-800">DUERP</strong></div>}
                    {duerpState === 'partiel' && <div className="text-sm text-surface-600 py-0.5"><ArrowRight className="h-3 w-3 inline mr-1 text-brand-500" />Mettre a jour le <strong className="text-surface-800">DUERP</strong></div>}
                  </div>
                </div>

                {/* Speech */}
                <div className="card p-5">
                  <div className="p-4 rounded-xl bg-success-50/50 border border-success-100 mb-4">
                    <div className="text-xs font-semibold text-success-700 mb-2">A dire</div>
                    <div className="text-sm text-surface-600 leading-relaxed">
                      &laquo; Suite a vos reponses, on voit qu'il y a quelques <strong className="text-surface-800">preconisations a apporter</strong>, notamment sur <strong className="text-surface-800">{lacunes.map(l => l.label).join(', ') || 'les formations obligatoires'}</strong>. L'idee, c'est de <strong className="text-surface-800">former votre equipe</strong> et d'utiliser votre <strong className="text-surface-800">budget de formation annuel</strong>. Justement, on peut vous accompagner grace a votre <strong className="text-surface-800">budget OPCO</strong>. C'est une prise en charge a 100%, donc <strong className="text-surface-800">sans avance de frais</strong>. &raquo;
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="secondary" onClick={() => setPhase('questionnaire')} icon={<ArrowLeft className="h-4 w-4" />}>Retour questionnaire</Button>
                    <Button onClick={() => goToStep(2)} icon={<ArrowRight className="h-4 w-4" />}>Continuer</Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: OPCO */}
            {step === 2 && (
              <div className="card p-5">
                <div className="text-[11px] text-brand-600 font-semibold mb-3">ETAPE 2/6 - COMPTE OPCO</div>
                <h3 className="text-lg font-heading font-bold text-surface-900 mb-4">Budget OPCO</h3>
                <div className="p-4 rounded-xl bg-success-50/50 border border-success-100 mb-4">
                  <div className="text-xs font-semibold text-success-700 mb-1">Question cle</div>
                  <div className="text-sm font-semibold text-surface-800">&laquo; D'ailleurs, le compte OPCO, ca vous parle ? &raquo;</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[{ v: 'oui', label: 'OUI - Connait les budgets OPCO' }, { v: 'non', label: 'NON - Ne connait pas' }].map(o => (
                    <button key={o.v} onClick={() => { setOpcoKnown(o.v); goToStep(o.v === 'oui' ? '3a' : '3b') }}
                      className={cn('p-4 rounded-xl border text-left transition-all', opcoKnown === o.v ? 'bg-brand-50/50 border-brand-200 ring-1 ring-brand-200' : 'bg-surface-50 border-surface-200 hover:border-surface-300')}>
                      <div className="text-sm font-semibold text-surface-800">{o.label}</div>
                    </button>
                  ))}
                </div>
                <Button variant="secondary" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>Retour</Button>
              </div>
            )}

            {/* STEP 3A: Connait OPCO */}
            {step === '3a' && (
              <div className="card p-5">
                <div className="text-[11px] text-brand-600 font-semibold mb-3">ETAPE 3/6 - VERIFICATION OPCO</div>
                <h3 className="text-lg font-heading font-bold text-surface-900 mb-4">Verification du compte</h3>
                <div className="p-4 rounded-xl bg-success-50/50 border border-success-100 mb-4">
                  <div className="text-sm text-surface-600">&laquo; Parfait. <strong className="text-surface-800">Est-ce que vous savez si votre compte OPCO est actif</strong> aujourd'hui ? &raquo;</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[{ v: 'actif', label: 'OUI - Actif' }, { v: 'inactif', label: 'NON - Inactif / Ne sait pas' }].map(o => (
                    <button key={o.v} onClick={() => { setCompteActif(o.v); goToStep(4) }}
                      className={cn('p-3 rounded-xl border text-left transition-all', compteActif === o.v ? 'bg-brand-50/50 border-brand-200' : 'bg-surface-50 border-surface-200 hover:border-surface-300')}>
                      <div className="text-sm font-semibold text-surface-800">{o.label}</div>
                    </button>
                  ))}
                </div>
                <Button variant="secondary" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>Retour</Button>
              </div>
            )}

            {/* STEP 3B: Ne connait pas */}
            {step === '3b' && (
              <div className="card p-5">
                <div className="text-[11px] text-brand-600 font-semibold mb-3">ETAPE 3/6 - EXPLICATION OPCO</div>
                <h3 className="text-lg font-heading font-bold text-surface-900 mb-4">Explication OPCO</h3>
                <div className="p-4 rounded-xl bg-success-50/50 border border-success-100 mb-4">
                  <div className="text-xs font-semibold text-success-700 mb-1">A dire</div>
                  <div className="text-sm text-surface-600 leading-relaxed">
                    &laquo; L'<strong className="text-surface-800">OPCO</strong>, c'est un organisme qui attribue chaque annee des <strong className="text-surface-800">budgets de formation</strong> aux professionnels. Ces budgets permettent de <strong className="text-surface-800">mettre a jour la conformite reglementaire</strong> et de former les equipes, <strong className="text-surface-800">sans aucune avance de frais</strong>. &raquo;
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>Retour</Button>
                  <Button onClick={() => goToStep(4)} icon={<ArrowRight className="h-4 w-4" />}>Continuer</Button>
                </div>
              </div>
            )}

            {/* STEP 4: Accompagnement */}
            {step === 4 && (
              <div className="card p-5">
                <div className="text-[11px] text-brand-600 font-semibold mb-3">ETAPE 4/6 - ACCOMPAGNEMENT</div>
                <h3 className="text-lg font-heading font-bold text-surface-900 mb-4">Notre accompagnement</h3>
                <div className="p-4 rounded-xl bg-success-50/50 border border-success-100 mb-4">
                  <div className="text-xs font-semibold text-success-700 mb-1">A dire</div>
                  <div className="text-sm text-surface-600 leading-relaxed">
                    &laquo; Notre organisme est <strong className="text-surface-800">certifie Qualiopi</strong>, specialise dans votre secteur. Nous nous occupons de <strong className="text-surface-800">tout</strong> : montage administratif OPCO, organisation des formations, suivi post-formation. &raquo;
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 mb-4 space-y-1.5">
                  {['Securiser votre entreprise face aux controles', 'Optimiser le rendement de vos equipes', 'Ameliorer l\'efficacite operationnelle', 'Diminuer les risques hygiene et securite', 'Prise en charge a 100% via budget OPCO'].map((t, i) => (
                    <div key={i} className="text-sm text-surface-600 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success-500 shrink-0" /><strong className="text-surface-800">{t}</strong></div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>Retour</Button>
                  <Button onClick={() => goToStep(5)} icon={<ArrowRight className="h-4 w-4" />}>Continuer</Button>
                </div>
              </div>
            )}

            {/* STEP 5: Projection */}
            {step === 5 && (
              <div className="card p-5">
                <div className="text-[11px] text-brand-600 font-semibold mb-3">ETAPE 5/6 - PROJECTION</div>
                <h3 className="text-lg font-heading font-bold text-surface-900 mb-4">Projection</h3>
                <div className="p-4 rounded-xl bg-success-50/50 border border-success-100 mb-4">
                  <div className="text-sm text-surface-600">&laquo; Nos delais sont d'environ <strong className="text-surface-800">un a deux mois</strong>. Vous vous situez plutot sur <strong className="text-surface-800">quel horizon</strong> pour la mise en conformite ? &raquo;</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Periode estimee</label>
                    <select className="input-base" value={projectionPeriode} onChange={e => setProjectionPeriode(e.target.value)}>
                      <option value="">Selectionner</option><option value="1-2mois">1 a 2 mois</option><option value="3-6mois">3 a 6 mois</option><option value="6mois+">Plus de 6 mois</option>
                    </select></div>
                  <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Date RDV</label><input className="input-base" type="date" value={rdvDate} onChange={e => setRdvDate(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>Retour</Button>
                  <Button onClick={() => goToStep(6)} icon={<ArrowRight className="h-4 w-4" />}>Continuer</Button>
                </div>
              </div>
            )}

            {/* STEP 6: Engagement */}
            {step === 6 && (
              <div className="card p-5">
                <div className="text-[11px] text-brand-600 font-semibold mb-3">ETAPE 6/6 - ENGAGEMENT</div>
                <h3 className="text-lg font-heading font-bold text-surface-900 mb-4">Niveau d'engagement</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { v: 'positif', label: 'Positif', desc: 'Veut avancer', color: 'border-success-200 bg-success-50/30' },
                    { v: 'hesitant', label: 'Hesitant', desc: 'Reflechit', color: 'border-warning-200 bg-warning-50/30' },
                    { v: 'refus', label: 'Refus', desc: 'Ne veut pas', color: 'border-danger-200 bg-danger-50/30' },
                  ].map(o => (
                    <button key={o.v} onClick={() => { setEngagement(o.v); goToStep(o.v === 'positif' ? '6a' : o.v === 'hesitant' ? '6b' : '6c') }}
                      className={cn('p-4 rounded-xl border text-center transition-all', engagement === o.v ? 'ring-2 ring-brand-300 ' + o.color : 'bg-surface-50 border-surface-200 hover:border-surface-300')}>
                      <div className="text-sm font-semibold text-surface-800">{o.label}</div>
                      <div className="text-xs text-surface-500 mt-0.5">{o.desc}</div>
                    </button>
                  ))}
                </div>
                <Button variant="secondary" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>Retour</Button>
              </div>
            )}

            {/* 6A: Positif */}
            {step === '6a' && (
              <div className="card p-5">
                <div className="text-[11px] text-success-600 font-semibold mb-3">ENGAGEMENT POSITIF</div>
                <h3 className="text-lg font-heading font-bold text-surface-900 mb-4">Prise de RDV</h3>
                <div className="p-4 rounded-xl bg-success-50/50 border border-success-100 mb-4">
                  <div className="text-sm text-surface-600">&laquo; Parfait, je vous envoie le <strong className="text-surface-800">rapport de conformite par email</strong>. On peut caler un <strong className="text-surface-800">creneau</strong> pour finaliser ? &raquo;</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Date</label><input className="input-base" type="date" value={rdvDate} onChange={e => setRdvDate(e.target.value)} /></div>
                  <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Heure</label><input className="input-base" type="time" value={rdvHeure} onChange={e => setRdvHeure(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>Retour</Button>
                  <Button onClick={() => setPhase('rapport')} icon={<Eye className="h-4 w-4" />}>Voir le rapport</Button>
                </div>
              </div>
            )}

            {/* 6B: Hesitant */}
            {step === '6b' && (
              <div className="card p-5">
                <div className="text-[11px] text-warning-600 font-semibold mb-3">HESITANT</div>
                <h3 className="text-lg font-heading font-bold text-surface-900 mb-4">Relance prevue</h3>
                <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Action de suivi</label>
                  <select className="input-base mb-4" value={hesitantAction} onChange={e => setHesitantAction(e.target.value)}>
                    <option value="">Selectionner</option><option value="rappel">Rappeler dans quelques jours</option><option value="email">Envoyer un email recapitulatif</option><option value="rdv">Proposer un nouveau RDV</option>
                  </select></div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>Retour</Button>
                  <Button onClick={() => setPhase('rapport')} icon={<Eye className="h-4 w-4" />}>Voir le rapport</Button>
                </div>
              </div>
            )}

            {/* 6C: Refus */}
            {step === '6c' && (
              <div className="card p-5">
                <div className="text-[11px] text-danger-600 font-semibold mb-3">REFUS</div>
                <h3 className="text-lg font-heading font-bold text-surface-900 mb-4">Raison du refus</h3>
                <div><label className="text-xs font-medium text-surface-500 mb-1.5 block">Raison</label>
                  <select className="input-base mb-4" value={refusRaison} onChange={e => setRefusRaison(e.target.value)}>
                    <option value="">Selectionner</option><option value="budget">Probleme de budget</option><option value="timing">Pas le bon moment</option><option value="confiance">Manque de confiance</option><option value="autre">Autre</option>
                  </select></div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={goBack} icon={<ArrowLeft className="h-4 w-4" />}>Retour</Button>
                  <Button onClick={() => setPhase('rapport')} icon={<Eye className="h-4 w-4" />}>Voir le rapport</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ PHASE 3 : RAPPORT ═══ */}
      {phase === 'rapport' && (
        <div className="space-y-5">
          {/* Score global */}
          <div className="card p-8 text-center">
            {etabNom && <div className="text-sm text-surface-500 mb-1">{etabNom} {etabType ? '(' + etabType + ')' : ''}</div>}
            <div className="text-xs text-surface-400 mb-1">Score de conformite global</div>
            <div className="text-6xl font-heading font-bold tracking-display" style={{ color: scoreColor(scoreData.score) }}>
              {scoreData.score > 0 ? scoreData.score.toFixed(1) : '--'}
            </div>
            <div className="text-sm text-surface-400">/5</div>
            <div className="h-3 rounded-full bg-surface-100 mt-4 max-w-md mx-auto overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(scoreData.score / 5) * 100}%`, backgroundColor: scoreColor(scoreData.score) }} />
            </div>
            <div className="mt-3">
              <Badge variant={scoreData.score >= 4 ? 'success' : scoreData.score >= 2.5 ? 'warning' : 'danger'}>
                {scoreData.score >= 4 ? 'Bon niveau de conformite' : scoreData.score >= 2.5 ? 'A ameliorer' : 'Critique'}
              </Badge>
            </div>
            <div className="text-xs text-surface-400 mt-2">Taux de couverture : {scoreData.coverage}%</div>
          </div>

          {/* Detail par formation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['haccp', 'duerp', 'sst', 'incendie'].map(k => {
              const pct = scoreData.pcts[k]
              const t = parseInt(formations[k].total) || 0
              const f = parseInt(formations[k].formed) || 0
              return (
                <div key={k} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span style={{ color: COLORS[k] }}>{ICONS[k]}</span>
                      <span className="text-sm font-heading font-semibold text-surface-900">{LABELS[k]}</span>
                    </div>
                    <span className={cn('text-2xl font-heading font-bold', covColor(pct))}>{pct !== null ? pct + '%' : '--'}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 mb-2 overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-700', covBg(pct))} style={{ width: `${pct || 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant={pct !== null && pct >= 80 ? 'success' : pct !== null && pct >= 50 ? 'warning' : 'danger'}>{covStatus(pct)}</Badge>
                    <span className="text-surface-400">{f}/{t} formes</span>
                  </div>
                  {pct !== null && pct < 80 && (
                    <div className="mt-3 p-2.5 rounded-lg bg-danger-50/60 border border-danger-100">
                      <div className="text-xs text-danger-600">{LEGAL[k].text}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Recommandations */}
          <div className="card p-5">
            <div className="text-sm font-heading font-semibold text-surface-900 mb-3">Recommandations</div>
            <div className="space-y-2">
              {lacunes.map(l => (
                <div key={l.k} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
                  <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: COLORS[l.k] }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-surface-800">Formation {l.label} -- {l.manquants} personne(s) a former</div>
                    <div className="text-xs text-surface-500">{LEGAL[l.k].text}</div>
                  </div>
                  <Badge variant={l.pct < 40 ? 'danger' : 'warning'}>{covStatus(l.pct)}</Badge>
                </div>
              ))}
              {lacunes.length === 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-success-50/60">
                  <CheckCircle2 className="h-4 w-4 text-success-500" />
                  <span className="text-sm text-success-700">Tous les axes sont conformes</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPhase('script')} icon={<ArrowLeft className="h-4 w-4" />}>Retour au script</Button>
            <Button variant="secondary" onClick={() => setPhase('questionnaire')} icon={<ArrowLeft className="h-4 w-4" />}>Modifier le questionnaire</Button>
          </div>
        </div>
      )}
    </div>
  )
}
