'use client'

import { useMemo } from 'react'
import { Download, CheckCircle2, AlertTriangle, MinusCircle, ArrowRight, FolderCheck } from 'lucide-react'

type Statut = 'ok' | 'todo' | 'na'
interface DossierItem {
  label: string
  ind?: string
  statut: Statut
  note?: string
  href?: string          // téléchargement direct
  goTab?: string         // aller à un onglet de la session
}

interface Props {
  sessionId: string
  formationId: string | null
  inscriptions: any[]
  emargements: any[]
  conventions: any[]
  satisfaction: any[]
  nbEvalAcquis: number
  recueil: any
  supports: any[]
  rapport: any
  onGoTab: (tab: string) => void
}

const PILL: Record<Statut, { cls: string; Icon: any; label: string }> = {
  ok: { cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2, label: 'Présent' },
  todo: { cls: 'bg-amber-50 text-amber-700', Icon: AlertTriangle, label: 'À compléter' },
  na: { cls: 'bg-surface-100 text-surface-500', Icon: MinusCircle, label: 'Non applicable' },
}

export function SessionDossier({ sessionId, formationId, inscriptions, emargements, conventions, satisfaction, nbEvalAcquis, recueil, supports, rapport, onGoTab }: Props) {
  const nbInscrits = inscriptions.length
  const signed = emargements.filter((e) => e.signature_data || e.est_present).length
  const conv = conventions[0]
  const convSigned = conventions.some((c) => ['signee_client', 'signee_of', 'signee_complete'].includes(c.status))

  const phases = useMemo(() => {
    const avant: DossierItem[] = [
      { label: 'Programme de formation', ind: '5·6', statut: formationId ? 'ok' : 'todo', href: formationId ? `/api/pdf/programme/${formationId}?session=${sessionId}` : undefined },
      { label: 'Analyse du besoin (recueil)', ind: '4', statut: recueil?.statut === 'complete' ? 'ok' : 'todo', note: recueil?.statut === 'complete' ? undefined : 'À remplir', goTab: 'recueil' },
      { label: 'Convention de formation', ind: '18', statut: conv ? (convSigned ? 'ok' : 'todo') : 'todo', note: conv ? (convSigned ? undefined : 'À signer') : 'À créer', href: conv ? `/api/pdf/convention/${conv.id}` : undefined, goTab: conv ? undefined : 'conventions' },
      { label: 'Convocation', ind: '9', statut: 'ok', href: `/api/pdf/convocation-session/${sessionId}` },
    ]
    const pendant: DossierItem[] = [
      { label: 'Émargement (feuille vierge)', ind: '12', statut: 'ok', href: `/api/pdf/emargement/${sessionId}` },
      { label: 'Émargement signé', ind: '12', statut: signed > 0 ? 'ok' : 'todo', note: `${signed}/${nbInscrits} présences`, href: `/api/pdf/emargement-signe/${sessionId}` },
      { label: 'Supports pédagogiques remis', ind: '19', statut: supports.length > 0 ? 'ok' : 'todo', note: `${supports.length} support(s)`, goTab: 'contenu' },
    ]
    const apres: DossierItem[] = [
      { label: 'Évaluation des acquis', ind: '11', statut: nbEvalAcquis > 0 ? 'ok' : 'todo', note: `${nbEvalAcquis} évaluation(s)`, goTab: 'evaluations' },
      { label: 'Attestations de fin de formation', ind: '11', statut: nbInscrits > 0 ? 'ok' : 'na', note: `${nbInscrits} apprenant(s) — par apprenant`, goTab: 'apprenants' },
      { label: 'Certificats de réalisation', ind: '11', statut: nbInscrits > 0 ? 'ok' : 'na', note: 'par apprenant', goTab: 'apprenants' },
      { label: 'Questionnaire de satisfaction', ind: '30', statut: satisfaction.length > 0 ? 'ok' : 'todo', note: `${satisfaction.length} réponse(s)`, goTab: 'qcm' },
      { label: 'Rapport / bilan de session', ind: '—', statut: rapport?.status === 'soumis' || rapport?.submitted_at ? 'ok' : 'todo', goTab: 'rapport' },
    ]
    return [
      { titre: 'Avant la formation', items: avant },
      { titre: 'Pendant la formation', items: pendant },
      { titre: 'Fin de formation', items: apres },
    ]
  }, [sessionId, formationId, recueil, conv, convSigned, signed, nbInscrits, supports.length, nbEvalAcquis, satisfaction.length, rapport])

  const all = phases.flatMap((p) => p.items).filter((i) => i.statut !== 'na')
  const ok = all.filter((i) => i.statut === 'ok').length
  const pct = all.length ? Math.round((ok / all.length) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Barre de complétude */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderCheck className="h-5 w-5 text-brand-500" />
            <h3 className="font-heading font-semibold text-surface-900">Dossier de la session</h3>
          </div>
          <div className="text-sm font-semibold text-surface-700"><span className="text-brand-600 text-lg">{ok}</span>/{all.length} pièces · {pct}%</div>
        </div>
        <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-surface-900'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-surface-500 mt-2">Toutes les pièces attendues par l'auditeur pour cette session (RNQ v9), du début à la fin.</p>
      </div>

      {phases.map((phase) => (
        <div key={phase.titre}>
          <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">{phase.titre}</div>
          <div className="card divide-y divide-surface-100">
            {phase.items.map((it, i) => {
              const p = PILL[it.statut]
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-2xs font-semibold ${p.cls}`}>
                    <p.Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-800">{it.label}{it.ind && it.ind !== '—' && <span className="ml-2 text-2xs font-mono text-surface-400">Ind. {it.ind}</span>}</div>
                    {it.note && <div className="text-xs text-surface-500 mt-0.5">{it.note}</div>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {it.href && (
                      <a href={it.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-100 text-surface-700 hover:bg-surface-200 transition-colors">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    )}
                    {it.goTab && (
                      <button onClick={() => onGoTab(it.goTab!)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors">
                        Ouvrir <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
