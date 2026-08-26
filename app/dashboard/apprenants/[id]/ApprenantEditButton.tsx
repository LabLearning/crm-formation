'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from '@/components/ui/icons'
import { Button, Modal, useToast } from '@/components/ui'
import { ApprenantForm } from '../ApprenantForm'

export function ApprenantEditButton({ apprenant, clients }: { apprenant: any; clients: { id: string; raison_sociale: string | null }[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} icon={<Pencil className="h-4 w-4" />}>Modifier</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Modifier l'apprenant" size="lg">
        <ApprenantForm
          apprenant={apprenant}
          clients={clients}
          onDone={() => { setOpen(false); toast('success', 'Apprenant mis à jour'); router.refresh() }}
        />
      </Modal>
    </>
  )
}
