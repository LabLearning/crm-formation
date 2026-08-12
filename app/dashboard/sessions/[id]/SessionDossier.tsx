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
  supports: any[]
  rapport: any
  onGoTab: (tab: string) => void
}

const PILL: Record<Statut, { cls: string; Icon: any; label: string }> = {
  ok: { cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2, label: 'Présent' },
  todo: { cls: 'bg-amber-50 text-amber-700', Icon: AlertTriangle, label: 'À compléter' },
  na: { cls: 'bg-surface-100 text-surface-500', Icon: MinusCircle, label: 'Non applicable' },
}

/**
 * Documents que le CRM produit ou rassemble pour une session.
 *
 * Volontairement distinct du bloc « Complétude du dossier », qui juge les sept
 * pièces attendues par l'auditeur. Les deux coexistaient en se recouvrant, et
 * jugeaient parfois différemment la même pièce — un émargement pouvait être
 * vert ici et rouge là. Ce bloc ne porte donc plus de verdict sur ces
 * sept-là : il donne accès aux documents et aux écrans, rien de plus.
 */
export function SessionDossier({ sessionId, formationId, inscriptions, supports, rapport, onGoTab }: Props) {
  const nbInscrits = inscriptions.length

  const phases = useMemo(() => {
    const avant: DossierItem[] = [
      { label: 'Programme de formation', ind: '5·6', statut: formationId ? 'ok' : 'todo', href: formationId ? `/api/pdf/programme/${formationId}?session=${sessionId}` : undefined },
      { label: 'Convocation', ind: '9', statut: 'ok', href: `/api/pdf/convocation-session/${sessionId}` },
    ]
    const pendant: DossierItem[] = [
      { label: 'Feuille d\'émargement vierge', ind: '12', statut: 'ok', note: 'à imprimer pour la salle', href: `/api/pdf/emargement/${sessionId}` },
      { label: 'Supports pédagogiques remis', ind: '19', statut: supports.length > 0 ? 'ok' : 'todo', note: `${supports.length} support(s)`, goTab: 'contenu' },
    ]
    const apres: DossierItem[] = [
      { label: 'Attestations de fin de formation', ind: '11', statut: nbInscrits > 0 ? 'ok' : 'na', note: `${nbInscrits} apprenant(s) — par apprenant`, goTab: 'apprenants' },
      { label: 'Certificats de réalisation', ind: '11', statut: nbInscrits > 0 ? 'ok' : 'na', note: 'par apprenant', goTab: 'apprenants' },
      { label: 'Rapport / bilan de session', ind: '—', statut: rapport?.status === 'soumis' || rapport?.submitted_at ? 'ok' : 'todo', goTab: 'rapport' },
    ]
    return [
      { titre: 'Avant la formation', items: avant },
      { titre: 'Pendant la formation', items: pendant },
      { titre: 'Fin de formation', items: apres },
    ]
  }, [sessionId, formationId, nbInscrits, supports.length, rapport])

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <FolderCheck className="h-5 w-5 text-brand-500" />
          <h3 className="font-heading font-semibold text-surface-900">Documents de la session</h3>
        </div>
        <p className="text-xs text-surface-500 mt-1">
          Ce que le CRM produit ou rassemble, dans l&apos;ordre du déroulement.
          Les sept pièces attendues par l&apos;auditeur sont suivies au-dessus.
        </p>
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
