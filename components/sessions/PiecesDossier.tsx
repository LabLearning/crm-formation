'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Circle, Upload, Download, Trash2, Loader2, ShieldAlert,
  FolderCheck, ArrowRight, MinusCircle,
} from 'lucide-react'
import { Button, Modal, Input, Select, useToast } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { PIECES, ORIGINES, completude } from '@/lib/pieces-session'
import type { EtatPiece } from '@/lib/pieces-session'
import { deposerPieceAction, retirerPieceAction, lienPieceAction } from '@/app/dashboard/sessions/[id]/pieces-actions'

const LABEL_ORIGINE: Record<string, string> = {
  crm: 'Produite par le CRM',
  mail: 'Reçue par mail',
  papier: 'Numérisée',
  dendreo: 'Ancien outil',
}

/** Ligne du dossier qui n'est pas une pièce d'audit : un document, une étape. */
interface Annexe {
  cle: string
  label: string
  aide: string
  faite: boolean
  href?: string
  onglet?: string
}

/**
 * Dossier complet d'une action de formation.
 *
 * Un seul écran, dans l'ordre du déroulement : ce qu'il faut avant, pendant et
 * après. Chaque ligne donne son état, le document quand il existe, et le moyen
 * de le compléter — dépôt d'un justificatif ou renvoi vers l'écran concerné.
 *
 * Les sept pièces d'audit portent leur indicateur et un seul verdict, celui du
 * contrôle de complétude. Le reste — programme, convocation, supports,
 * attestations, rapport — figure pour l'accès, pas pour le score : ces
 * documents ne conditionnent pas la conformité de la même façon, et les
 * mélanger au compteur donnerait une complétude flatteuse mais fausse.
 */
export function PiecesDossier({
  sessionId, etats, tableManquante, formationId, nbSupports = 0,
  rapportFait = false, nbInscrits = 0, onGoTab,
}: {
  sessionId: string
  etats: (EtatPiece & { fichier?: string | null; dateDepot?: string | null })[]
  tableManquante?: boolean
  formationId?: string | null
  nbSupports?: number
  rapportFait?: boolean
  nbInscrits?: number
  onGoTab?: (onglet: string) => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [depot, setDepot] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const parCle = new Map(etats.map((e) => [e.cle, e]))
  const etat = completude(etats)

  async function deposer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const res = await deposerPieceAction(sessionId, new FormData(e.currentTarget))
    setSaving(false)
    if (!res.success) { toast('error', res.error || 'Erreur'); return }
    toast('success', 'Pièce enregistrée')
    setDepot(null)
    router.refresh()
  }

  async function ouvrir(documentId: string) {
    setBusy(documentId)
    const r = await lienPieceAction(documentId)
    setBusy(null)
    if (r.success) window.open((r.data as any).url, '_blank')
    else toast('error', r.error || 'Erreur')
  }

  async function retirer(documentId: string) {
    if (!confirm('Retirer ce justificatif ?')) return
    setBusy(documentId)
    const r = await retirerPieceAction(documentId, sessionId)
    setBusy(null)
    if (r.success) { toast('success', 'Justificatif retiré'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  const pieceEnCours = PIECES.find((p) => p.cle === depot)
  const piece = (cle: string) => PIECES.find((p) => p.cle === cle)!

  // ── Le dossier, dans l'ordre du déroulement ──
  const phases: { titre: string; lignes: (string | Annexe)[] }[] = [
    {
      titre: 'Avant la formation',
      lignes: [
        {
          cle: 'programme', label: 'Programme de formation',
          aide: 'Objectifs, contenu, modalités — généré depuis la fiche formation.',
          faite: !!formationId,
          href: formationId ? `/api/pdf/programme/${formationId}?session=${sessionId}` : undefined,
        },
        'recueil',
        'convention',
        'contrat',
        {
          cle: 'convocation', label: 'Convocation des stagiaires',
          aide: 'Dates, lieu, horaires — à envoyer avant le démarrage.',
          faite: true,
          href: `/api/pdf/convocation-session/${sessionId}`,
        },
        'positionnement',
      ],
    },
    {
      titre: 'Pendant la formation',
      lignes: [
        {
          cle: 'feuille_vierge', label: 'Feuille d’émargement vierge',
          aide: 'À imprimer pour la salle si l’émargement se fait sur papier.',
          faite: true,
          href: `/api/pdf/emargement/${sessionId}`,
        },
        'emargement',
        {
          cle: 'supports', label: 'Supports pédagogiques remis',
          aide: 'Documents distribués aux stagiaires pendant la session.',
          faite: nbSupports > 0,
          onglet: 'contenu',
        },
      ],
    },
    {
      titre: 'Après la formation',
      lignes: [
        'acquis',
        'satisfaction',
        {
          cle: 'attestations', label: 'Attestations de fin de formation',
          aide: 'Une par stagiaire, depuis la liste des apprenants.',
          faite: nbInscrits > 0,
          onglet: 'apprenants',
        },
        {
          cle: 'certificats', label: 'Certificats de réalisation',
          aide: 'Un par stagiaire, exigé par le financeur.',
          faite: nbInscrits > 0,
          onglet: 'apprenants',
        },
        {
          cle: 'rapport', label: 'Rapport de session',
          aide: 'Bilan du formateur sur le déroulement.',
          faite: rapportFait,
          onglet: 'rapport',
        },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-heading font-semibold text-surface-900 flex items-center gap-2">
              <FolderCheck className="h-4 w-4 text-brand-500" />
              Dossier de la session
            </h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Tout ce qui compose l&apos;action, du premier document au dernier. Le compteur ne porte que
              sur les pièces qu&apos;un auditeur exigera.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn('text-2xl font-heading font-bold', etat.complet ? 'text-success-600' : 'text-danger-600')}>
              {etat.presentes}/{etat.total}
            </div>
            <div className="text-[11px] text-surface-500">pièces d&apos;audit</div>
          </div>
        </div>

        <div className="h-2 rounded-full bg-surface-100 overflow-hidden mt-4">
          <div className={cn('h-full rounded-full transition-all duration-500', etat.complet ? 'bg-success-500' : 'bg-surface-900')}
            style={{ width: `${(etat.presentes / etat.total) * 100}%` }} />
        </div>

        {etat.majeuresManquantes.length > 0 && (
          <div className="mt-4 flex items-start gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-danger-500 mt-0.5 shrink-0" />
            <div className="text-surface-700">
              <span className="font-medium">{etat.majeuresManquantes.length} pièce(s) à enjeu majeur manquante(s) : </span>
              {etat.majeuresManquantes.map((p) => `${p.label} (ind. ${p.indicateur})`).join(' · ')}
            </div>
          </div>
        )}
      </div>

      {tableManquante && (
        <div className="card p-4 border-warning-200 bg-warning-50/50 text-sm text-surface-700">
          Appliquez la migration <code className="px-1.5 py-0.5 rounded bg-white border border-warning-200 text-xs">124_pieces_dossier_session.sql</code> pour pouvoir déposer les justificatifs.
        </div>
      )}

      {phases.map((phase) => (
        <div key={phase.titre}>
          <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 px-1">{phase.titre}</div>
          <div className="card divide-y divide-surface-100">
            {phase.lignes.map((ligne) => {
              // ── Pièce d'audit ──
              if (typeof ligne === 'string') {
                const p = piece(ligne)
                const e = parCle.get(p.cle)
                const ok = !!e?.presente
                return (
                  <div key={p.cle} className={cn('flex items-center gap-3 px-4 py-3 flex-wrap', !ok && p.majeure && 'bg-danger-50/30')}>
                    <span className="shrink-0">
                      {ok ? <CheckCircle2 className="h-5 w-5 text-success-500" /> : <Circle className={cn('h-5 w-5', p.majeure ? 'text-danger-400' : 'text-surface-300')} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-surface-900">{p.label}</span>
                        <span className="text-[11px] text-surface-400">indicateur {p.indicateur}</span>
                        {p.majeure && !ok && (
                          <span className="text-[10px] font-semibold text-danger-700 bg-danger-50 border border-danger-100 rounded-full px-1.5 py-0.5">
                            Enjeu majeur
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-surface-500 mt-0.5">
                        {ok
                          ? `${LABEL_ORIGINE[e!.source || 'crm'] || e!.source}${e!.dateDepot ? ` · ${formatDate(e!.dateDepot)}` : ''}${e!.fichier ? ` · ${e!.fichier}` : ''}`
                          : p.aide}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {e?.documentId && (
                        <>
                          <button onClick={() => ouvrir(e.documentId!)} disabled={busy === e.documentId}
                            className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs disabled:opacity-50">
                            {busy === e.documentId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            Ouvrir
                          </button>
                          <button onClick={() => retirer(e.documentId!)} disabled={busy === e.documentId}
                            className="p-2 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                            aria-label="Retirer le justificatif">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {!e?.documentId && (
                        <Button size="sm" variant={ok ? 'secondary' : 'primary'} onClick={() => setDepot(p.cle)} icon={<Upload className="h-4 w-4" />}>
                          {ok ? 'Ajouter' : 'Déposer'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              }

              // ── Document ou étape, hors périmètre du compteur ──
              return (
                <div key={ligne.cle} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <span className="shrink-0">
                    {ligne.faite
                      ? <CheckCircle2 className="h-5 w-5 text-surface-300" />
                      : <MinusCircle className="h-5 w-5 text-surface-300" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-surface-700">{ligne.label}</div>
                    <div className="text-xs text-surface-400 mt-0.5">{ligne.aide}</div>
                  </div>
                  <div className="shrink-0">
                    {ligne.href && (
                      <a href={ligne.href} target="_blank" rel="noreferrer"
                        className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    )}
                    {ligne.onglet && onGoTab && (
                      <button onClick={() => onGoTab(ligne.onglet!)}
                        className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs">
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

      <Modal isOpen={!!depot} onClose={() => setDepot(null)} title={pieceEnCours ? `Déposer : ${pieceEnCours.label}` : 'Déposer une pièce'} size="md">
        <form onSubmit={deposer} className="space-y-4">
          <input type="hidden" name="piece" value={depot || ''} />
          {pieceEnCours && <p className="text-sm text-surface-600">{pieceEnCours.aide}</p>}

          <div>
            <label htmlFor="fichier" className="block text-sm font-medium text-surface-700 mb-1.5">Fichier (PDF ou image, 15 Mo maximum)</label>
            <input id="fichier" name="fichier" type="file" accept=".pdf,image/*" required
              className="block w-full text-sm text-surface-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-surface-200 file:bg-white file:text-sm file:font-medium hover:file:bg-surface-50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select id="origine" name="origine" label="Provenance" options={ORIGINES} defaultValue="mail" />
            <Input id="date_piece" name="date_piece" type="date" label="Date de la pièce" />
          </div>

          <Input id="description" name="description" label="Précision (facultatif)" placeholder="Ex. reçue de Kevin Devie le 8 août" />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDepot(null)}>Annuler</Button>
            <Button type="submit" isLoading={saving} icon={<Upload className="h-4 w-4" />}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
