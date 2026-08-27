'use client'

import { CheckCircle2, XCircle, Clock, Eye, Mail } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import type { EnvoiEmail } from '@/lib/emails-session'

/**
 * Historique d'envois UNIFIÉ — le même rendu partout (Mails, Contractualisation,
 * Dossier) : objet, destinataire, statut (avec « Ouvert » si opened_at), date.
 * Remplace quatre copies locales du même bloc.
 */
export function PilluleStatutEnvoi({ status, openedAt }: { status?: string | null; openedAt?: string | null }) {
  if (openedAt) return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600"><Eye className="h-3 w-3" /> Ouvert</span>
  const s = status || 'pending'
  if (s === 'sent') return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Envoyé</span>
  if (s === 'failed') return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger-600"><XCircle className="h-3 w-3" /> Échec</span>
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600"><Clock className="h-3 w-3" /> En cours</span>
}

function fmt(d?: string | null): string {
  if (!d) return ''
  try {
    const dt = new Date(d)
    return `${dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  } catch { return '' }
}

export function HistoriqueEnvois({ envois, montrerDestinataire = true, vide = 'Aucun envoi', max = 12, className }: {
  envois: EnvoiEmail[]
  montrerDestinataire?: boolean
  vide?: string
  max?: number
  className?: string
}) {
  if (!envois.length) return <div className="text-xs text-surface-400 py-3 text-center">{vide}</div>
  return (
    <div className={cn('divide-y divide-surface-100', className)}>
      {envois.slice(0, max).map((l, i) => (
        <div key={i} className="flex items-center gap-2 py-2 text-xs">
          <Mail className="h-3.5 w-3.5 text-surface-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-surface-700 truncate">{l.subject || '—'}</div>
            {montrerDestinataire && l.to_email && <div className="text-surface-400 truncate">{l.to_email}</div>}
          </div>
          <PilluleStatutEnvoi status={l.status} openedAt={l.opened_at} />
          <span className="text-surface-400 shrink-0 tabular-nums">{fmt(l.sent_at || l.created_at)}</span>
        </div>
      ))}
    </div>
  )
}
