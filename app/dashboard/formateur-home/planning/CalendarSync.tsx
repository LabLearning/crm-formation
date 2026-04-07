'use client'

import { useState } from 'react'
import { Calendar, Copy, CheckCircle2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarSyncProps {
  calendarUrl: string
}

export function CalendarSync({ calendarUrl }: CalendarSyncProps) {
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(calendarUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // URL Google Calendar pour s'abonner
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarUrl.replace('https://', 'webcal://'))}`
  // URL webcal pour Apple Calendar / Outlook
  const webcalUrl = calendarUrl.replace('https://', 'webcal://')

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors shrink-0"
      >
        <Calendar className="h-4 w-4" />
        Synchroniser
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-900/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-modal p-6 space-y-5">
            <div>
              <h2 className="text-base font-heading font-semibold text-surface-900">Synchroniser mon calendrier</h2>
              <p className="text-sm text-surface-500 mt-1">
                Vos sessions de formation apparaîtront automatiquement dans votre calendrier.
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-surface-200 hover:bg-surface-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-blue-600">G</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-surface-900">Google Agenda</div>
                  <div className="text-xs text-surface-500">S'abonner automatiquement</div>
                </div>
                <ExternalLink className="h-4 w-4 text-surface-400" />
              </a>

              <a
                href={webcalUrl}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-surface-200 hover:bg-surface-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-surface-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-surface-900">Apple Calendar / Outlook</div>
                  <div className="text-xs text-surface-500">Ouvre l'app calendrier automatiquement</div>
                </div>
                <ExternalLink className="h-4 w-4 text-surface-400" />
              </a>
            </div>

            {/* URL manuelle */}
            <div>
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Ou copiez l'URL du flux</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={calendarUrl}
                  readOnly
                  className="input-base text-xs font-mono flex-1 truncate"
                />
                <button
                  onClick={handleCopy}
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm font-medium transition-colors shrink-0',
                    copied ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  )}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-surface-400 mt-2">
                Collez cette URL dans n'importe quelle application de calendrier pour recevoir les mises à jour automatiquement.
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-xl border border-surface-200 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
