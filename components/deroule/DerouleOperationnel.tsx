'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, MinusCircle, ChevronDown, AlertTriangle, Wrench } from 'lucide-react'
import { useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { ETAPES, SOCLE, TRACABILITE, POSTURE, DPO_TITRE, DPO_VERSION, etatDeroule } from '@/lib/dpo'
import { validerEtapeDerouleAction } from '@/app/dashboard/sessions/[id]/deroule-actions'

interface Validation { etape_cle: string; statut: string; commentaire?: string | null; validated_at?: string | null }

/**
 * Déroulé opérationnel d'une session : les 7 étapes de la méthode terrain,
 * validées une par une par le formateur. Ce qui manque est signalé en rouge.
 */
export interface EtatSocle { cle: string; fait: boolean; detail: string }

export function DerouleOperationnel({
  sessionId, validations, canValidate, tableManquante, socle = [], estHygiene = false,
}: {
  sessionId: string
  validations: Validation[]
  canValidate: boolean
  tableManquante?: boolean
  /** État calculé des 4 jalons communs à toutes les sessions. */
  socle?: EtatSocle[]
  /** Le déroulé terrain ne s'affiche que pour les formations hygiène. */
  estHygiene?: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const parCle = new Map(validations.map((v) => [v.etape_cle, v]))
  const etat = etatDeroule(validations)

  async function valider(cle: string, statut: string) {
    setBusy(cle)
    const res = await validerEtapeDerouleAction(sessionId, cle, statut)
    setBusy(null)
    if (!res.success) { toast('error', res.error || 'Erreur'); return }
    toast('success', statut === 'fait' ? 'Étape validée' : statut === 'non_applicable' ? 'Étape marquée non applicable' : 'Étape rouverte')
    router.refresh()
  }

  const socleParCle = new Map(socle.map((s) => [s.cle, s]))
  const socleManquants = SOCLE.filter((j) => !socleParCle.get(j.cle)?.fait)

  return (
    <div className="space-y-4">
      {/* Socle commun — vaut pour toutes les sessions. L'état est calculé à
          partir des questionnaires réellement remplis, pas déclaré. */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-heading font-semibold text-surface-900">Parcours qualité de la session</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Les quatre jalons attendus sur toute formation, quel qu&apos;en soit le sujet
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn('text-2xl font-heading font-bold', socleManquants.length === 0 ? 'text-success-600' : 'text-danger-600')}>
              {SOCLE.length - socleManquants.length}/{SOCLE.length}
            </div>
            <div className="text-[11px] text-surface-500">jalons couverts</div>
          </div>
        </div>

        <div className="space-y-2">
          {SOCLE.map((j) => {
            const e = socleParCle.get(j.cle)
            return (
              <div key={j.cle} className={cn('rounded-xl border p-3 flex items-start gap-3', e?.fait ? 'border-surface-200' : 'border-danger-200 bg-danger-50/30')}>
                <span className="shrink-0 mt-0.5">
                  {e?.fait ? <CheckCircle2 className="h-4.5 w-4.5 text-success-500" /> : <Circle className="h-4.5 w-4.5 text-danger-400" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn('text-sm font-medium', e?.fait ? 'text-surface-800' : 'text-danger-700')}>{j.titre}</div>
                  <div className="text-xs text-surface-500">{j.quand} · {j.description}</div>
                  <div className="text-xs text-surface-400 mt-0.5">{e?.detail || j.ou}</div>
                </div>
                {!e?.fait && <span className="shrink-0 h-2 w-2 rounded-full bg-danger-500 mt-1.5" aria-label="Manquant" />}
              </div>
            )
          })}
        </div>
      </div>

      {!estHygiene ? null : (
      <>
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-heading font-semibold text-surface-900">Déroulé pédagogique opérationnel</h2>
            <p className="text-xs text-surface-500 mt-0.5">{DPO_TITRE}</p>
            <p className="text-xs text-surface-400 mt-1">
              Audit → Actions → Formation → Audit de sortie · version {DPO_VERSION}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn('text-2xl font-heading font-bold', etat.complet ? 'text-success-600' : 'text-danger-600')}>
              {etat.faites}/{etat.total}
            </div>
            <div className="text-[11px] text-surface-500">étapes validées</div>
          </div>
        </div>

        <div className="h-2 rounded-full bg-surface-100 overflow-hidden mt-4">
          <div
            className={cn('h-full rounded-full transition-all duration-500', etat.complet ? 'bg-success-500' : 'bg-surface-900')}
            style={{ width: `${(etat.faites / etat.total) * 100}%` }}
          />
        </div>

        {!etat.complet && (
          <div className="mt-4 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-danger-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-surface-800">
                {etat.manquantes.length} étape{etat.manquantes.length > 1 ? 's' : ''} à valider :
              </span>{' '}
              <span className="text-surface-600">{etat.manquantes.map((e) => e.titre).join(' · ')}</span>
            </div>
          </div>
        )}

        <p className="text-xs text-surface-500 italic mt-4 pt-3 border-t border-surface-100">{POSTURE}</p>
      </div>

      {tableManquante && (
        <div className="card p-4 border-warning-200 bg-warning-50/50 text-sm text-surface-700">
          Appliquez la migration <code className="px-1.5 py-0.5 rounded bg-white border border-warning-200 text-xs">119_deroule_operationnel.sql</code> pour enregistrer les validations.
        </div>
      )}

      {/* Les 7 étapes */}
      <div className="space-y-2">
        {ETAPES.map((e) => {
          const v = parCle.get(e.cle)
          const statut = v?.statut || 'a_faire'
          const manque = e.obligatoire && statut === 'a_faire'
          const estOuvert = ouvert === e.cle
          return (
            <div key={e.cle} className={cn('card overflow-hidden', manque && 'border-danger-200')}>
              <button
                onClick={() => setOuvert(estOuvert ? null : e.cle)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-50/60 transition-colors"
              >
                <span className="shrink-0">
                  {statut === 'fait' ? <CheckCircle2 className="h-5 w-5 text-success-500" />
                    : statut === 'non_applicable' ? <MinusCircle className="h-5 w-5 text-surface-300" />
                    : <Circle className="h-5 w-5 text-danger-400" />}
                </span>
                <span className="h-6 w-6 rounded-lg bg-surface-100 text-surface-600 text-[11px] font-heading font-bold flex items-center justify-center shrink-0">
                  {e.numero}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm font-heading font-semibold', manque ? 'text-danger-700' : 'text-surface-900')}>
                    {e.titre}
                  </span>
                  <span className="block text-xs text-surface-500 truncate">{e.intention}</span>
                </span>
                {manque && (
                  <span className="shrink-0 h-2 w-2 rounded-full bg-danger-500" aria-label="Étape manquante" />
                )}
                <ChevronDown className={cn('h-4 w-4 text-surface-400 shrink-0 transition-transform', estOuvert && 'rotate-180')} />
              </button>

              {estOuvert && (
                <div className="px-4 pb-4 pt-1 border-t border-surface-100 space-y-4">
                  <div>
                    <div className="section-label mb-1.5">Objectifs pédagogiques</div>
                    <ul className="space-y-1">
                      {e.objectifs.map((o) => (
                        <li key={o} className="text-sm text-surface-700 flex gap-2">
                          <span className="text-surface-300">·</span>{o}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="section-label mb-1.5">Attendus</div>
                    <ul className="space-y-1">
                      {e.attendus.map((a) => (
                        <li key={a} className="text-sm text-surface-700 flex gap-2">
                          <span className="text-surface-300">·</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {e.outil && (
                    <div className="rounded-xl bg-brand-50/60 border border-brand-100 p-3 flex items-start gap-2.5">
                      <Wrench className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-surface-700">
                        <span className="font-medium">{e.outil.nom}</span> — {e.outil.ou}
                      </div>
                    </div>
                  )}

                  {v?.validated_at && (
                    <div className="text-xs text-surface-400">
                      Validée le {new Date(v.validated_at).toLocaleDateString('fr-FR')}
                    </div>
                  )}

                  {canValidate && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {([
                        { s: 'fait', label: 'Étape réalisée', cls: 'btn-primary' },
                        { s: 'non_applicable', label: 'Non applicable ici', cls: 'btn-secondary' },
                        ...(statut !== 'a_faire' ? [{ s: 'a_faire', label: 'Rouvrir', cls: 'btn-secondary' }] : []),
                      ]).filter((b) => b.s !== statut).map((b) => (
                        <button
                          key={b.s}
                          onClick={() => valider(e.cle, b.s)}
                          disabled={busy === e.cle}
                          className={cn(b.cls, 'text-sm !py-1.5 !px-3 disabled:opacity-50')}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Traçabilité propre à l'intervention terrain */}
      <div className="card p-5">
        <h3 className="text-sm font-heading font-semibold text-surface-900 mb-3">Traçabilité et évaluations</h3>
        <div className="space-y-4">
          {TRACABILITE.map((bloc) => (
            <div key={bloc.moment}>
              <div className="section-label mb-1.5">{bloc.moment}</div>
              <ul className="space-y-1.5">
                {bloc.items.map((i) => (
                  <li key={i.cle} className="text-sm text-surface-700">
                    {i.label}
                    <span className="block text-xs text-surface-400">{i.outil}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  )
}
