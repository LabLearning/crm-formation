'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Zap, CheckCircle2 } from 'lucide-react'
import { Modal, Button, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { saisieRapideAction } from '@/app/dashboard/sessions/[id]/qcm-rapide-actions'

interface Reponse { id: string; qcm_id: string; apprenant_id: string; is_complete: boolean; score: number | null }
interface QcmSession { qcm_id: string; qcm?: { titre: string; type: string } | null }
interface Apprenant { id: string; prenom?: string; nom?: string }

const COURT: Record<string, string> = {
  positionnement: 'Positionnement',
  sortie: 'Acquis',
  satisfaction_chaud: 'Satisfaction',
  satisfaction_froid: 'Satisfaction J+90',
  evaluation_formateur: 'Éval. formateur',
}
/** Une satisfaction n'a ni bonne ni mauvaise réponse : elle se coche, elle ne se note pas. */
const NOTE = (t?: string) => t === 'positionnement' || t === 'sortie'

/**
 * Saisie groupée des résultats d'une session.
 *
 * Le formateur a ses questionnaires papier remplis sous les yeux : on lui
 * demande un chiffre par stagiaire, pas de retaper trente réponses. Le
 * document papier reste la pièce justificative et se dépose au dossier.
 */
export function SaisieRapide({
  sessionId, ouvert, onClose, qcmSessions, reponses, apprenants, dateFin,
}: {
  sessionId: string
  ouvert: boolean
  onClose: () => void
  qcmSessions: QcmSession[]
  reponses: Reponse[]
  apprenants: Apprenant[]
  dateFin?: string | null
}) {
  // La satisfaction à froid se recueille à J+90 : avant, il n'y a rien à saisir.
  const froidPossible = dateFin
    ? (Date.now() - new Date(dateFin).getTime()) / 86400000 >= 90
    : false
  const router = useRouter()
  const { toast } = useToast()
  const [valeurs, setValeurs] = useState<Record<string, string>>({})
  const [coches, setCoches] = useState<Record<string, boolean>>({})
  const [enCours, setEnCours] = useState(false)

  // On ne montre que les questionnaires du parcours, dans l'ordre chronologique.
  const colonnes = useMemo(() => {
    const ordre = ['positionnement', 'sortie', 'satisfaction_chaud', 'satisfaction_froid']
    return [...qcmSessions]
      .filter((q) => ordre.includes(q.qcm?.type || ''))
      .filter((q) => q.qcm?.type !== 'satisfaction_froid' || froidPossible)
      .sort((a, b) => ordre.indexOf(a.qcm?.type || '') - ordre.indexOf(b.qcm?.type || ''))
  }, [qcmSessions, froidPossible])

  const reponseDe = (apprenantId: string, qcmId: string) =>
    reponses.find((r) => r.apprenant_id === apprenantId && r.qcm_id === qcmId)

  const aEnregistrer = useMemo(() => {
    const out: { reponseId: string; score?: number | null }[] = []
    for (const a of apprenants) {
      for (const c of colonnes) {
        const r = reponseDe(a.id, c.qcm_id)
        if (!r || r.is_complete) continue
        if (NOTE(c.qcm?.type)) {
          const v = valeurs[r.id]
          if (v !== undefined && v !== '') out.push({ reponseId: r.id, score: Number(v) })
        } else if (coches[r.id]) {
          out.push({ reponseId: r.id, score: null })
        }
      }
    }
    return out
  }, [valeurs, coches, apprenants, colonnes, reponses])

  /** Reporte la valeur de la première ligne sur toutes les suivantes encore vides. */
  function propager(qcmId: string, type?: string) {
    const premier = apprenants.map((a) => reponseDe(a.id, qcmId)).find((r) => r && !r.is_complete)
    if (!premier) return
    if (NOTE(type)) {
      const v = valeurs[premier.id]
      if (v === undefined || v === '') return
      const maj = { ...valeurs }
      for (const a of apprenants) {
        const r = reponseDe(a.id, qcmId)
        if (r && !r.is_complete && !maj[r.id]) maj[r.id] = v
      }
      setValeurs(maj)
    } else {
      const maj = { ...coches }
      for (const a of apprenants) {
        const r = reponseDe(a.id, qcmId)
        if (r && !r.is_complete) maj[r.id] = true
      }
      setCoches(maj)
    }
  }

  async function enregistrer() {
    setEnCours(true)
    const r = await saisieRapideAction(sessionId, aEnregistrer)
    setEnCours(false)
    if (!r.success) { toast('error', r.error || 'Erreur'); return }
    toast('success', `${(r.data as any)?.enregistrees ?? 0} résultat(s) enregistré(s)`)
    setValeurs({}); setCoches({})
    onClose()
    router.refresh()
  }

  return (
    <Modal isOpen={ouvert} onClose={onClose} title="Saisie rapide des résultats" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-surface-600">
          Reportez le résultat de chaque stagiaire d&apos;après les questionnaires du formateur.
          Pensez à déposer son document dans l&apos;onglet Dossier : c&apos;est lui la pièce justificative.
        </p>
        {!froidPossible && (
          <p className="text-xs text-surface-500">
            La satisfaction à froid n&apos;apparaît pas : elle se recueille trois mois après la fin de
            la formation.
          </p>
        )}

        {colonnes.length === 0 || apprenants.length === 0 ? (
          <p className="text-sm text-surface-500 py-8 text-center">
            Aucun questionnaire ou aucun stagiaire sur cette session.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left font-medium text-surface-500 pb-2 pr-3 sticky left-0 bg-white">Stagiaire</th>
                  {colonnes.map((c) => (
                    <th key={c.qcm_id} className="pb-2 px-2 font-medium text-surface-500 whitespace-nowrap">
                      <div>{COURT[c.qcm?.type || ''] || c.qcm?.titre}</div>
                      <button type="button" onClick={() => propager(c.qcm_id, c.qcm?.type)}
                        className="text-[11px] font-normal text-brand-600 hover:underline">
                        appliquer à tous
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apprenants.map((a) => (
                  <tr key={a.id} className="border-t border-surface-100">
                    <td className="py-2 pr-3 text-surface-900 whitespace-nowrap sticky left-0 bg-white">
                      {`${a.prenom || ''} ${a.nom || ''}`.trim() || 'Stagiaire'}
                    </td>
                    {colonnes.map((c) => {
                      const r = reponseDe(a.id, c.qcm_id)
                      if (!r) return <td key={c.qcm_id} className="px-2 text-center text-surface-300">—</td>
                      if (r.is_complete) {
                        return (
                          <td key={c.qcm_id} className="px-2 text-center">
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {r.score != null ? `${r.score} %` : 'fait'}
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={c.qcm_id} className="px-2 py-1.5 text-center">
                          {NOTE(c.qcm?.type) ? (
                            <input
                              type="number" min={0} max={100} inputMode="numeric"
                              value={valeurs[r.id] ?? ''}
                              onChange={(e) => setValeurs((v) => ({ ...v, [r.id]: e.target.value }))}
                              placeholder="%"
                              className="w-20 text-center rounded-lg border border-surface-200 px-2 py-1.5 focus:border-surface-900 focus:outline-none"
                            />
                          ) : (
                            <input
                              type="checkbox" checked={!!coches[r.id]}
                              onChange={(e) => setCoches((c2) => ({ ...c2, [r.id]: e.target.checked }))}
                              className="h-4 w-4 accent-surface-900"
                            />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-surface-100">
          <span className={cn('text-xs', aEnregistrer.length ? 'text-surface-700' : 'text-surface-400')}>
            {aEnregistrer.length
              ? `${aEnregistrer.length} résultat${aEnregistrer.length > 1 ? 's' : ''} prêt${aEnregistrer.length > 1 ? 's' : ''} à enregistrer`
              : 'Renseignez au moins un résultat'}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Fermer</Button>
            <Button onClick={enregistrer} isLoading={enCours} disabled={aEnregistrer.length === 0}
              icon={<Save className="h-4 w-4" />}>
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export { Zap as IconeSaisieRapide }
