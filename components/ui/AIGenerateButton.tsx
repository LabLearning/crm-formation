'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIGenerateButtonProps {
  label?: string
  onClick: () => Promise<void>
  className?: string
  size?: 'sm' | 'md'
}

export function AIGenerateButton({ label = 'Générer avec l\'IA', onClick, className, size = 'md' }: AIGenerateButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await onClick()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'flex items-center gap-2 font-medium rounded-xl transition-all',
        'bg-gradient-to-r from-violet-500 to-brand-500 text-white hover:from-violet-600 hover:to-brand-600',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        className
      )}
    >
      {loading ? <Loader2 className={cn('animate-spin', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} /> : <Sparkles className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />}
      {loading ? 'Génération en cours...' : label}
    </button>
  )
}
