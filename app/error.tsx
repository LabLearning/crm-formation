'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="h-12 w-12 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-danger-500" />
        </div>
        <h2 className="text-lg font-heading font-bold text-surface-900 mb-2">Une erreur est survenue</h2>
        <p className="text-sm text-surface-500 mb-6">{error.message || 'Erreur inattendue. Veuillez reessayer.'}</p>
        <button onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-900 text-white text-sm font-medium hover:bg-surface-800 transition-colors">
          <RotateCcw className="h-4 w-4" /> Reessayer
        </button>
      </div>
    </div>
  )
}
