'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error('[Dashboard Error]', error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="h-14 w-14 rounded-2xl bg-danger-50 flex items-center justify-center mb-6">
        <AlertTriangle className="h-7 w-7 text-danger-500" />
      </div>
      <h2 className="text-xl font-heading font-bold text-surface-900 tracking-heading mb-2">
        Une erreur est survenue
      </h2>
      <p className="text-sm text-surface-500 max-w-md mb-8">
        Une erreur inattendue s&apos;est produite. Réessayez ou contactez le support si le problème persiste.
      </p>
      <Button onClick={reset} icon={<RefreshCw className="h-4 w-4" />}>
        Réessayer
      </Button>
    </div>
  )
}
