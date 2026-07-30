'use client'

import { useState, useTransition } from 'react'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
import { sendContactMessageAction } from './actions'

export function ContactForm() {
  const [pending, start] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const r = await sendContactMessageAction(fd)
      if (r.success) setSent(true)
      else setError(r.error || 'Erreur')
    })
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-[#195144]/20 bg-[#195144]/5 p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-[#195144] mx-auto flex items-center justify-center mb-3">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <div className="font-heading font-semibold text-lg text-[#14110F]">Message envoyé</div>
        <p className="text-sm text-[#57534E] mt-1">Merci — notre équipe vous répond sous 24–48 h ouvrées.</p>
      </div>
    )
  }

  const input = 'w-full rounded-xl border border-[#195144]/15 bg-white px-4 py-2.5 text-sm text-[#14110F] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#195144]/50 focus:ring-2 focus:ring-[#195144]/10'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="block text-xs font-semibold text-[#57534E] mb-1.5">Nom *</label><input name="nom" required className={input} placeholder="Votre nom" /></div>
        <div><label className="block text-xs font-semibold text-[#57534E] mb-1.5">Email *</label><input name="email" type="email" required className={input} placeholder="vous@entreprise.fr" /></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="block text-xs font-semibold text-[#57534E] mb-1.5">Entreprise</label><input name="entreprise" className={input} placeholder="Votre établissement" /></div>
        <div><label className="block text-xs font-semibold text-[#57534E] mb-1.5">Téléphone</label><input name="telephone" className={input} placeholder="06 …" /></div>
      </div>
      <div><label className="block text-xs font-semibold text-[#57534E] mb-1.5">Sujet</label><input name="sujet" className={input} placeholder="Ex : formation hygiène pour mon équipe" /></div>
      <div><label className="block text-xs font-semibold text-[#57534E] mb-1.5">Message *</label><textarea name="message" required rows={5} className={input + ' resize-none'} placeholder="Décrivez votre besoin…" /></div>

      {error && <div className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-xl px-4 py-2.5">{error}</div>}

      <button type="submit" disabled={pending}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#195144] text-white text-sm font-semibold hover:bg-[#123f34] disabled:opacity-60 transition-colors">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer le message
      </button>
    </form>
  )
}
