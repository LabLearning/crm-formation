'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Quote } from 'lucide-react'
import { Modal, useToast } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { detailReponseAction } from '@/app/dashboard/sessions/[id]/qcm-saisie-actions'

interface Ligne {
  question: string
  type: string
  plafond: number | null
  note: number | null
  texte: string | null
  choisis: string[]
  estCorrect: boolean | null
  attendu: string[]
}

/**
 * Ce qu'un stagiaire a répondu, question par question.
 *
 * Un pourcentage ne prouve rien d'une satisfaction. Les verbatims, si : ils
 * montrent que le recueil a eu lieu et ce qu'il a produit. C'est ce qu'on
 * ouvre devant un auditeur.
 */
export function DetailReponse({
  reponseId, onClose,
}: {
  reponseId: string | null
  onClose: () => void
}) {
  const { toast } = useToast()
  const [chargement, setChargement] = useState(false)
  const [entete, setEntete] = useState<any>(null)
  const [lignes, setLignes] = useState<Ligne[]>([])

  useEffect(() => {
    if (!reponseId) return
    setChargement(true); setLignes([]); setEntete(null)
    detailReponseAction(reponseId).then((r) => {
      setChargement(false)
      if (!r.success) { toast('error', r.error || 'Chargement impossible'); onClose(); return }
      const d = r.data as any
      setEntete({ ...d.reponse, sansDetail: !!d.sansDetail })
      setLignes(d.lignes || [])
    })
  }, [reponseId])

  const nom = entete?.apprenant
    ? `${entete.apprenant.prenom || ''} ${entete.apprenant.nom || ''}`.trim()
    : 'Stagiaire'

  return (
    <Modal isOpen={!!reponseId} onClose={onClose} title={entete?.qcm?.titre || 'Réponses du stagiaire'} size="lg">
      {chargement ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-surface-100">
            <div className="text-sm text-surface-900 font-medium">{nom}</div>
            <div className="text-xs text-surface-500">
              {entete?.date_realisation && <>Réalisé le {formatDate(entete.date_realisation)}</>}
              {entete?.score != null && (
                <span className="ml-3 font-semibold text-surface-700">
                  {String(entete?.qcm?.type || '').startsWith('satisfaction')
                    ? `${(entete.score / 20).toFixed(1)} / 5`
                    : `${entete.score} %`}
                </span>
              )}
            </div>
          </div>

          {/*
            Un résultat saisi en groupé n'a pas de détail par question : le
            formateur a mené l'entretien sur son support papier et n'a reporté
            que le résultat. Écrire « aucune réponse enregistrée » laisserait
            croire que le stagiaire n'a rien répondu — c'est le contraire.
          */}
          {lignes.length === 0 && (
            <div className="py-8 text-center">
              {entete?.is_complete && entete?.sansDetail ? (
                <>
                  <p className="text-sm text-surface-700">
                    Résultat reporté depuis le questionnaire rempli par le formateur.
                  </p>
                  <p className="text-xs text-surface-500 mt-1.5">
                    Le détail des réponses figure sur son document, déposé au dossier de la session.
                  </p>
                </>
              ) : (
                <p className="text-sm text-surface-500">
                  Ce questionnaire n&apos;a pas encore été renseigné pour ce stagiaire.
                </p>
              )}
            </div>
          )}

          {lignes.map((l, i) => (
            <div key={i} className="rounded-xl border border-surface-200 p-4">
              <div className="text-sm text-surface-800">
                <span className="text-surface-400 mr-1.5">{i + 1}.</span>{l.question}
              </div>

              <div className="mt-2.5">
                {l.plafond != null && l.note != null && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({ length: l.plafond }, (_, n) => (
                        <span key={n} className={cn('h-2 w-6 rounded-full',
                          n < l.note! ? 'bg-brand-500' : 'bg-surface-200')} />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-surface-800 tabular-nums">{l.note} / {l.plafond}</span>
                  </div>
                )}

                {l.choisis.length > 0 && (
                  <div className="flex items-start gap-2">
                    {l.estCorrect === true && <CheckCircle2 className="h-4 w-4 text-success-500 mt-0.5 shrink-0" />}
                    {l.estCorrect === false && <XCircle className="h-4 w-4 text-danger-500 mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm text-surface-800">{l.choisis.join(', ')}</div>
                      {l.estCorrect === false && l.attendu.length > 0 && (
                        <div className="text-xs text-surface-500 mt-0.5">Attendu : {l.attendu.join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}

                {l.texte && (
                  <div className="flex items-start gap-2">
                    <Quote className="h-3.5 w-3.5 text-surface-300 mt-1 shrink-0" />
                    <p className="text-sm text-surface-700 whitespace-pre-wrap">{l.texte}</p>
                  </div>
                )}

                {l.note == null && l.choisis.length === 0 && !l.texte && (
                  <div className="text-xs text-surface-400">Sans réponse</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
