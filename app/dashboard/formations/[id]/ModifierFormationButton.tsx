'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Modal, ToastProvider, useToast } from '@/components/ui'
import { FormationForm } from '../FormationForm'
import type { Formation } from '@/lib/types/formation'

/** Modification de la formation sans quitter sa fiche. */
function Bouton({ formation }: { formation: Formation }) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-surface-200 text-surface-700 hover:border-surface-300 transition-colors">
        <Pencil className="h-4 w-4" /> Modifier
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Modifier la formation" size="lg">
        <FormationForm
          formation={formation}
          onSuccess={() => { setOpen(false); toast('success', 'Formation mise à jour'); router.refresh() }}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  )
}

export function ModifierFormationButton({ formation }: { formation: Formation }) {
  return (
    <ToastProvider>
      <Bouton formation={formation} />
    </ToastProvider>
  )
}
