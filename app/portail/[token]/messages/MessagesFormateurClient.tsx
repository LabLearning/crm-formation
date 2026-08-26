'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Send, Loader2 } from '@/components/ui/icons'
import { cn, formatDate } from '@/lib/utils'
import { useToast, Avatar } from '@/components/ui'
import { repondreApprenantAction } from '../contact/actions'

interface Message {
  id: string
  apprenant_id: string
  auteur: string
  contenu: string
  lu: boolean
  created_at: string
  apprenant: { prenom: string | null; nom: string | null; entreprise: string | null } | null
}

export function MessagesFormateurClient({ token, messages }: { token: string; messages: Message[] }) {
  const { toast } = useToast()
  const router = useRouter()

  const fils = useMemo(() => {
    const map = new Map<string, Message[]>()
    for (const m of messages) {
      if (!map.has(m.apprenant_id)) map.set(m.apprenant_id, [])
      map.get(m.apprenant_id)!.push(m)
    }
    return [...map.entries()].sort((a, b) =>
      String(b[1][b[1].length - 1].created_at).localeCompare(String(a[1][a[1].length - 1].created_at)))
  }, [messages])

  const [ouvert, setOuvert] = useState<string | null>(fils[0]?.[0] || null)
  const [contenu, setContenu] = useState('')
  const [enCours, setEnCours] = useState(false)

  const fil = fils.find(([id]) => id === ouvert)?.[1] || []
  const apprenant = fil[0]?.apprenant

  async function repondre() {
    if (!ouvert || !contenu.trim()) return
    setEnCours(true)
    const r = await repondreApprenantAction(token, ouvert, contenu)
    setEnCours(false)
    if (r.success) { toast('success', 'Réponse envoyée'); setContenu(''); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-heading font-bold text-surface-900">Messages des apprenants</h1>
        <p className="text-sm text-surface-500 mt-1">Vos stagiaires vous écrivent depuis leur espace — répondez ici.</p>
      </div>

      {fils.length === 0 ? (
        <div className="card p-10 text-center text-sm text-surface-500">
          <MessageCircle className="h-6 w-6 mx-auto mb-2 text-surface-300" />
          Aucun message pour le moment.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[240px,1fr]">
          <div className="card overflow-hidden self-start">
            {fils.map(([id, msgs]) => {
              const a = msgs[0].apprenant
              const dernier = msgs[msgs.length - 1]
              return (
                <button key={id} onClick={() => setOuvert(id)}
                  className={cn('w-full px-3.5 py-3 flex items-center gap-2.5 text-left border-b border-surface-50 last:border-0 transition-colors',
                    id === ouvert ? 'bg-surface-50' : 'hover:bg-surface-50/60')}>
                  <Avatar firstName={a?.prenom || '?'} lastName={a?.nom || ''} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-surface-900 truncate">{a?.prenom} {a?.nom}</div>
                    <div className="text-2xs text-surface-400 truncate">{dernier.contenu}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-100 text-sm font-heading font-semibold text-surface-900">
              {apprenant?.prenom} {apprenant?.nom}{apprenant?.entreprise ? ` · ${apprenant.entreprise}` : ''}
            </div>
            <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
              {fil.map((m) => (
                <div key={m.id} className={cn('max-w-[85%]', m.auteur === 'formateur' ? 'ml-auto' : '')}>
                  <div className={cn('rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line',
                    m.auteur === 'formateur' ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-900')}>
                    {m.contenu}
                  </div>
                  <div className={cn('text-2xs text-surface-400 mt-1', m.auteur === 'formateur' ? 'text-right' : '')}>
                    {formatDate(m.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-surface-100 p-3 flex items-end gap-2">
              <textarea value={contenu} onChange={(e) => setContenu(e.target.value)} rows={2}
                placeholder="Votre réponse…" className="input-base flex-1 resize-none" />
              <button onClick={repondre} disabled={enCours || !contenu.trim()}
                className="btn-primary !p-2.5 disabled:opacity-50 shrink-0">
                {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
