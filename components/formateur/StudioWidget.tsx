'use client'

import { useState } from 'react'
import { FilePenLine, X, Loader2 } from 'lucide-react'
import { ToastProvider } from '@/components/ui/Toast'
import { StudioClient } from './StudioClient'
import { getStudioDataAction } from '@/app/mon-espace/studio/actions'
import { cn } from '@/lib/utils'

/**
 * Studio en bulle flottante (façon messagerie) : le formateur l'ouvre depuis
 * n'importe quelle page de son espace, sans onglet admin. Panneau latéral sur
 * ordinateur, plein écran sur mobile ; les données se chargent à l'ouverture.
 */
export function StudioWidget() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ sessions: any[]; generes: any[] } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  async function ouvrir() {
    setOpen(true)
    if (data || loading) return
    setLoading(true)
    const r = await getStudioDataAction()
    setLoading(false)
    if (r.success && r.data) setData(r.data)
    else setErreur(r.error || 'Chargement impossible')
  }

  return (
    <>
      {/* Bulle flottante — au-dessus de la barre mobile */}
      {!open && (
        <button
          onClick={ouvrir}
          aria-label="Ouvrir le Studio"
          className={cn(
            'fixed z-40 right-4 bottom-24 md:right-6 md:bottom-6',
            'flex items-center gap-2 rounded-full pl-4 pr-5 py-3 text-sm font-semibold text-white',
            'bg-gradient-to-r from-[#195144] to-[#2F9A72] shadow-lg shadow-[#195144]/30',
            'hover:opacity-95 hover:scale-[1.03] active:scale-100 transition-all',
          )}
        >
          <FilePenLine className="h-[18px] w-[18px]" />
          Studio
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-surface-900/30 backdrop-blur-[2px] animate-fade-in" onClick={() => setOpen(false)} />

          {/* Panneau de discussion : drawer droit sur desktop, plein écran mobile */}
          <div className={cn(
            'absolute bg-white shadow-2xl flex flex-col animate-slide-up md:animate-none',
            'inset-x-0 bottom-0 top-10 rounded-t-2xl',
            'md:inset-auto md:right-6 md:bottom-6 md:top-16 md:w-[480px] md:rounded-2xl md:border md:border-surface-200',
          )}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100 shrink-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-r from-[#195144] to-[#2F9A72] flex items-center justify-center shrink-0">
                <FilePenLine className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-surface-900">Studio</div>
                <div className="text-xs text-surface-500">Vos documents mis en page par l&apos;IA, aux couleurs de la franchise</div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fermer"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-surface-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement du studio…
                </div>
              )}
              {erreur && <div className="text-sm text-red-600 py-8 text-center">{erreur}</div>}
              {data && (
                <ToastProvider>
                  <StudioClient sessions={data.sessions} generes={data.generes} />
                </ToastProvider>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
