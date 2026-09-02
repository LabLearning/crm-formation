'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, Loader2, CheckCircle2, XCircle, Zap, RotateCcw } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

interface ActionProposee {
  id: string
  type: string
  params: Record<string, any>
  libelle: string
  etat?: 'en_attente' | 'en_cours' | 'faite' | 'ignoree' | 'erreur'
  resultat?: string
}
interface Message { role: 'user' | 'assistant'; content: string; actions?: ActionProposee[] }

const CLE_HISTO = 'll_assistant_conversation'

/**
 * Assistant CRM en bulle flottante (équipe interne). L'IA lit le CRM et
 * répond avec des liens ; elle peut aussi PROPOSER des actions (convocation,
 * convention, relance) que l'utilisateur confirme d'un clic — rien ne part
 * sans confirmation humaine. La conversation survit à la navigation
 * (localStorage), « Nouvelle conversation » remet à zéro.
 */

/** Rendu minimal du markdown de l'assistant : liens, gras, listes. */
function LigneRendue({ texte }: { texte: string }) {
  const morceaux: React.ReactNode[] = []
  const regex = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g
  let curseur = 0
  let m: RegExpExecArray | null
  let cle = 0
  while ((m = regex.exec(texte)) !== null) {
    if (m.index > curseur) morceaux.push(texte.slice(curseur, m.index))
    if (m[1] && m[2]) {
      morceaux.push(
        <a key={cle++} href={m[2]} target="_blank" rel="noreferrer"
          className="font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700">
          {m[1]}
        </a>,
      )
    } else if (m[3]) {
      morceaux.push(<strong key={cle++} className="font-semibold text-surface-900">{m[3]}</strong>)
    }
    curseur = m.index + m[0].length
  }
  if (curseur < texte.length) morceaux.push(texte.slice(curseur))
  return <>{morceaux}</>
}

function MessageRendu({ contenu }: { contenu: string }) {
  const lignes = contenu.split('\n')
  return (
    <div className="space-y-1">
      {lignes.map((l, i) => {
        const puce = /^\s*[-•]\s+/.test(l)
        if (!l.trim()) return <div key={i} className="h-1" />
        return (
          <div key={i} className={cn('text-sm leading-relaxed', puce && 'pl-3 relative before:content-["•"] before:absolute before:left-0 before:text-brand-500')}>
            <LigneRendue texte={l.replace(/^\s*[-•]\s+/, '')} />
          </div>
        )
      })}
    </div>
  )
}

const SUGGESTIONS = [
  'Quelles sessions cette semaine ?',
  'Qui nous doit de l’argent ?',
  'Qui n’a pas signé ses émargements ?',
]

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [saisie, setSaisie] = useState('')
  const [busy, setBusy] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  // La conversation survit à la navigation entre pages du CRM.
  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE_HISTO)
      if (brut) setMessages(JSON.parse(brut))
    } catch { /* stockage indisponible */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(CLE_HISTO, JSON.stringify(messages.slice(-40))) } catch { /* plein */ }
  }, [messages])

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  async function envoyer(texte?: string) {
    const contenu = (texte ?? saisie).trim()
    if (!contenu || busy) return
    const suivant: Message[] = [...messages, { role: 'user', content: contenu }]
    setMessages(suivant)
    setSaisie('')
    setBusy(true)
    try {
      const r = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // L'API n'attend que role/content : on ne renvoie pas les cartes d'action.
        body: JSON.stringify({ messages: suivant.map(({ role, content }) => ({ role, content })) }),
      })
      const j = await r.json().catch(() => null)
      const reponse = r.ok && j?.reponse ? j.reponse : (j?.error || 'L’assistant est indisponible, réessaie.')
      const actions: ActionProposee[] = (j?.actions || []).map((a: any) => ({ ...a, etat: 'en_attente' }))
      setMessages((prev) => [...prev, { role: 'assistant', content: reponse, actions: actions.length ? actions : undefined }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connexion impossible, réessaie dans un instant.' }])
    }
    setBusy(false)
  }

  function majAction(idxMessage: number, idAction: string, patch: Partial<ActionProposee>) {
    setMessages((prev) => prev.map((mes, i) => i !== idxMessage ? mes : {
      ...mes,
      actions: mes.actions?.map((a) => a.id === idAction ? { ...a, ...patch } : a),
    }))
  }

  async function confirmerAction(idxMessage: number, action: ActionProposee) {
    majAction(idxMessage, action.id, { etat: 'en_cours' })
    try {
      const r = await fetch('/api/assistant/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: action.type, params: action.params }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.success) majAction(idxMessage, action.id, { etat: 'faite', resultat: j.message })
      else majAction(idxMessage, action.id, { etat: 'erreur', resultat: j?.message || j?.error || 'Échec' })
    } catch {
      majAction(idxMessage, action.id, { etat: 'erreur', resultat: 'Connexion impossible' })
    }
  }

  function CarteAction({ action, idxMessage }: { action: ActionProposee; idxMessage: number }) {
    return (
      <div className={cn(
        'mt-2 rounded-xl border px-3 py-2.5',
        action.etat === 'faite' ? 'border-emerald-200 bg-emerald-50'
        : action.etat === 'erreur' ? 'border-danger-200 bg-danger-50'
        : action.etat === 'ignoree' ? 'border-surface-200 bg-surface-50 opacity-60'
        : 'border-amber-200 bg-amber-50',
      )}>
        <div className="flex items-start gap-2">
          <Zap className={cn('h-4 w-4 mt-0.5 shrink-0', action.etat === 'faite' ? 'text-emerald-600' : action.etat === 'erreur' ? 'text-danger-500' : 'text-amber-500')} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-surface-800">{action.libelle}</div>
            {action.resultat && (
              <div className={cn('text-[11px] mt-0.5', action.etat === 'faite' ? 'text-emerald-700' : 'text-danger-600')}>{action.resultat}</div>
            )}
          </div>
        </div>
        {(action.etat === 'en_attente' || action.etat === 'en_cours') && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => confirmerAction(idxMessage, action)}
              disabled={action.etat === 'en_cours'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              {action.etat === 'en_cours' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirmer et envoyer
            </button>
            <button
              onClick={() => majAction(idxMessage, action.id, { etat: 'ignoree' })}
              disabled={action.etat === 'en_cours'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-50 disabled:opacity-50">
              <XCircle className="h-3.5 w-3.5" /> Ignorer
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l’assistant CRM"
          className={cn(
            'fixed z-40 right-4 bottom-24 md:right-6 md:bottom-6',
            'flex items-center gap-2 rounded-full pl-4 pr-5 py-3 text-sm font-semibold text-white',
            'bg-gradient-to-r from-[#205040] to-[#38C588] shadow-lg shadow-[#205040]/30',
            'hover:opacity-95 hover:scale-[1.03] active:scale-100 transition-all',
          )}
        >
          <Sparkles className="h-[18px] w-[18px]" />
          Assistant
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 md:inset-auto md:right-6 md:bottom-6 md:h-[640px] md:max-h-[calc(100vh-3rem)] md:w-[440px] flex flex-col bg-white md:rounded-3xl shadow-2xl shadow-black/25 ring-1 ring-black/5 overflow-hidden">
          {/* En-tête */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#205040] to-[#2c6e55] text-white shrink-0">
            <span className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center"><Sparkles className="h-4 w-4" /></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Assistant CRM</div>
              <div className="text-[11px] text-white/70">Interne · les actions partent après votre confirmation</div>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} title="Nouvelle conversation" aria-label="Nouvelle conversation"
                className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Fil */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface-50">
            {messages.length === 0 && (
              <div className="pt-6 text-center space-y-4">
                <p className="text-sm text-surface-500 max-w-[280px] mx-auto">
                  Demandez n&apos;importe quoi sur le CRM : une session, un client, un document, un chiffre.
                  Je peux aussi envoyer une convocation, une convention ou relancer une facture, avec votre accord.
                </p>
                <div className="flex flex-col items-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => envoyer(s)}
                      className="text-xs font-medium text-brand-600 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 hover:bg-brand-50 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((mes, i) => (
              <div key={i} className={cn('flex', mes.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5',
                  mes.role === 'user' ? 'bg-brand-500 text-white text-sm' : 'bg-white ring-1 ring-black/5 text-surface-700',
                )}>
                  {mes.role === 'user' ? mes.content : <MessageRendu contenu={mes.content} />}
                  {mes.actions?.map((a) => <CarteAction key={a.id} action={a} idxMessage={i} />)}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white ring-1 ring-black/5 px-3.5 py-2.5 inline-flex items-center gap-2 text-sm text-surface-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Je consulte le CRM…
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          {/* Saisie */}
          <div className="p-3 border-t border-surface-100 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                placeholder="Votre question…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-surface-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400/40 focus:border-brand-300 max-h-28"
              />
              <button
                onClick={() => envoyer()}
                disabled={!saisie.trim() || busy}
                aria-label="Envoyer"
                className="h-10 w-10 shrink-0 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 disabled:opacity-40 transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
