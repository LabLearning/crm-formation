'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui'
import { sendQcmToApprenantsAction } from './qcm-send-actions'

/**
 * Bouton « Envoyer aux apprenants » d'un questionnaire de session (côté
 * formateur) : email brandé + WhatsApp (si opt-in) avec lien vers le portail.
 */
export function SendQcmButton({ token, sessionId, qcmId, titre }: { token: string; sessionId: string; qcmId: string; titre: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()

  function send() {
    if (!confirm(`Envoyer « ${titre} » à tous les apprenants inscrits (email + WhatsApp) ?`)) return
    start(async () => {
      const r = await sendQcmToApprenantsAction(sessionId, qcmId, token || null)
      if (r.success) { toast('success', `Questionnaire envoyé à ${r.data?.count ?? 0} apprenant(s)`); router.refresh() }
      else toast('error', r.error || 'Erreur')
    })
  }

  return (
    <button onClick={send} disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors shrink-0">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Envoyer aux apprenants
    </button>
  )
}
