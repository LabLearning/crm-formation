'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from '@/components/ui/icons'
import { Modal, Button, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { chargerQuestionnaireAction, saisirQuestionnaireAction } from '@/app/dashboard/sessions/[id]/qcm-saisie-actions'

interface Choix { id: string; texte: string; position: number }
interface Question {
  id: string; texte: string; type: string; points: number; position: number
  explication: string | null; choix: Choix[]
}

/**
 * Saisie d'un questionnaire pour le compte d'un stagiaire.
 *
 * Le formateur conduit l'entretien oralement, stagiaire par stagiaire ; les
 * réponses sont reportées ici. Le score se calcule comme pour une réponse
 * saisie par l'intéressé.
 */
export function SaisieQuestionnaire({
  reponseId, apprenantNom, onClose,
}: {
  reponseId: string | null
  apprenantNom: string
  onClose: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [chargement, setChargement] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)
  const [titre, setTitre] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [reponses, setReponses] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!reponseId) return
    setChargement(true)
    setReponses({})
    chargerQuestionnaireAction(reponseId).then((r) => {
      setChargement(false)
      if (!r.success) { toast('error', r.error || 'Chargement impossible'); onClose(); return }
      const d = r.data as any
      setTitre(d.qcm?.titre || 'Questionnaire')
      setQuestions((d.questions || []) as Question[])
    })
  }, [reponseId])

  const manquantes = questions.filter((q) => !reponses[q.id]).length

  async function enregistrer() {
    if (!reponseId) return
    setEnregistrement(true)
    const r = await saisirQuestionnaireAction(reponseId, reponses)
    setEnregistrement(false)
    if (!r.success) { toast('error', r.error || 'Erreur'); return }
    const score = (r.data as any)?.score
    toast('success', score != null ? `Enregistré — ${score} %` : 'Enregistré')
    onClose()
    router.refresh()
  }

  return (
    <Modal isOpen={!!reponseId} onClose={onClose} title={titre || 'Saisie du questionnaire'} size="lg">
      {chargement ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
      ) : (
        <div className="space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-surface-500 py-6 text-center">Ce questionnaire ne contient aucune question.</p>
          )}

          {questions.map((q, i) => {
            const choix = [...(q.choix || [])].sort((a, b) => a.position - b.position)
            const echelle = q.type === 'note_1_5' ? 5 : q.type === 'note_1_10' ? 10 : q.type === 'nps' ? 10 : 0
            return (
              <div key={q.id} className="rounded-xl border border-surface-200 p-4">
                <div className="text-sm font-medium text-surface-900 mb-3">
                  <span className="text-surface-400 mr-1.5">{i + 1}.</span>{q.texte}
                </div>

                {choix.length > 0 && (
                  <div className="space-y-1.5">
                    {choix.map((c) => (
                      <label key={c.id}
                        className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                          reponses[q.id] === c.id ? 'border-surface-900 bg-surface-50' : 'border-surface-200 hover:bg-surface-50')}>
                        <input type="radio" name={q.id} checked={reponses[q.id] === c.id}
                          onChange={() => setReponses((r) => ({ ...r, [q.id]: c.id }))}
                          className="accent-surface-900" />
                        <span className="text-sm text-surface-800">{c.texte}</span>
                      </label>
                    ))}
                  </div>
                )}

                {echelle > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: echelle }, (_, n) => String(n + 1)).map((v) => (
                      <button key={v} type="button" onClick={() => setReponses((r) => ({ ...r, [q.id]: v }))}
                        className={cn('h-9 w-9 rounded-lg border text-sm font-medium transition-colors',
                          reponses[q.id] === v ? 'border-surface-900 bg-surface-900 text-white' : 'border-surface-200 text-surface-600 hover:bg-surface-50')}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}

                {choix.length === 0 && echelle === 0 && (
                  <textarea rows={3} value={reponses[q.id] || ''}
                    onChange={(e) => setReponses((r) => ({ ...r, [q.id]: e.target.value }))}
                    placeholder="Réponse du stagiaire, telle que rapportée"
                    className="input-base w-full resize-y" />
                )}
              </div>
            )
          })}

          {questions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs text-surface-500">
                {manquantes === 0
                  ? 'Toutes les questions sont renseignées.'
                  : `${manquantes} question${manquantes > 1 ? 's' : ''} sans réponse — elles seront enregistrées vides.`}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>Annuler</Button>
                <Button onClick={enregistrer} isLoading={enregistrement} icon={<Save className="h-4 w-4" />}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
