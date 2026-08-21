'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Send, Loader2, GraduationCap } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui'
import { envoyerMessageFormateurAction } from './actions'

interface FormateurRef { id: string; nom: string; formation: string }
interface Message { id: string; formateur_id: string; auteur: string; contenu: string; created_at: string }

export function ContactFormateurClient({ token, formateurs, messages }: {
  token: string
  formateurs: FormateurRef[]
  messages: Message[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [formateurId, setFormateurId] = useState(formateurs[0]?.id || '')
  const [contenu, setContenu] = useState('')
  const [enCours, setEnCours] = useState(false)

  const fil = messages.filter((m) => m.formateur_id === formateurId)
  const formateur = formateurs.find((f) => f.id === formateurId)

  async function envoyer() {
    if (!contenu.trim()) { toast('error', 'Écrivez votre message'); return }
    setEnCours(true)
    const r = await envoyerMessageFormateurAction(token, formateurId, contenu)
    setEnCours(false)
    if (r.success) { toast('success', 'Message envoyé au formateur'); setContenu(''); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-heading font-bold text-surface-900">Contacter mon formateur</h1>
        <p className="text-sm text-surface-500 mt-1">
          Une question sur la formation, un document, un empêchement : écrivez directement à votre formateur.
        </p>
      </div>

      {formateurs.length === 0 ? (
        <div className="card p-10 text-center text-sm text-surface-500">Aucun formateur associé à vos formations.</div>
      ) : (
        <>
          {formateurs.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {formateurs.map((f) => (
                <button key={f.id} onClick={() => setFormateurId(f.id)}
                  className={cn('px-3.5 py-2 rounded-xl text-sm font-medium transition-colors',
                    f.id === formateurId ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200')}>
                  {f.nom}
                </button>
              ))}
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-heading font-semibold text-surface-900">{formateur?.nom}</span>
              {formateur?.formation && <span className="text-xs text-surface-400 truncate">· {formateur.formation}</span>}
            </div>

            <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
              {fil.length === 0 && (
                <div className="text-center py-6 text-sm text-surface-400">
                  <MessageCircle className="h-6 w-6 mx-auto mb-2 text-surface-300" />
                  Pas encore de message — écrivez le premier.
                </div>
              )}
              {fil.map((m) => (
                <div key={m.id} className={cn('max-w-[85%]', m.auteur === 'apprenant' ? 'ml-auto' : '')}>
                  <div className={cn('rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line',
                    m.auteur === 'apprenant' ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-900')}>
                    {m.contenu}
                  </div>
                  <div className={cn('text-2xs text-surface-400 mt-1', m.auteur === 'apprenant' ? 'text-right' : '')}>
                    {m.auteur === 'formateur' ? 'Formateur · ' : ''}
                    {formatDate(m.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-surface-100 p-3 flex items-end gap-2">
              <textarea value={contenu} onChange={(e) => setContenu(e.target.value)} rows={2}
                placeholder="Votre message…" className="input-base flex-1 resize-none" />
              <button onClick={envoyer} disabled={enCours || !contenu.trim()}
                className="btn-primary !p-2.5 disabled:opacity-50 shrink-0">
                {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
