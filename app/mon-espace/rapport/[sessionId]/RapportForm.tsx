'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Save, Send } from 'lucide-react'
import { useToast } from '@/components/ui'
import { enregistrerRapportAction } from '../actions'

const CHAMPS: { nom: string; label: string; aide?: string }[] = [
  { nom: 'contenu_aborde', label: 'Contenu abordé', aide: 'Les séquences réellement traitées pendant la session' },
  { nom: 'objectifs_atteints', label: 'Objectifs atteints' },
  { nom: 'objectifs_non_atteints', label: 'Objectifs non atteints', aide: 'Et pourquoi — temps, niveau du groupe, matériel…' },
  { nom: 'difficultes_rencontrees', label: 'Difficultés rencontrées' },
  { nom: 'points_positifs', label: 'Points positifs' },
  { nom: 'recommandations', label: 'Recommandations', aide: 'Suites à donner : approfondissement, session complémentaire, adaptation du programme' },
  { nom: 'commentaires_generaux', label: 'Commentaires généraux' },
]

/** Rapport de fin de session : brouillon ré-enregistrable, puis transmission
 *  définitive au gestionnaire. */
export function RapportForm({ sessionId, initial, transmis }: {
  sessionId: string
  initial: Record<string, string | null> | null
  transmis: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [enCours, setEnCours] = useState<'brouillon' | 'transmettre' | null>(null)
  const [fait, setFait] = useState(transmis)

  async function soumettre(e: React.FormEvent<HTMLFormElement>, transmettre: boolean) {
    e.preventDefault()
    setEnCours(transmettre ? 'transmettre' : 'brouillon')
    const fd = new FormData(e.currentTarget)
    fd.set('session_id', sessionId)
    fd.set('transmettre', String(transmettre))
    const r = await enregistrerRapportAction(fd)
    setEnCours(null)
    if (r.success) {
      if (transmettre) { setFait(true); toast('success', 'Rapport transmis au gestionnaire') }
      else toast('success', 'Brouillon enregistré')
      router.refresh()
    } else toast('error', r.error || 'Erreur')
  }

  if (fait) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <div className="font-heading text-lg font-bold text-surface-900">Rapport transmis</div>
        <p className="text-sm text-surface-500 mt-1.5">
          Merci — votre rapport est arrivé chez le gestionnaire et rejoint le dossier de la session.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => soumettre(e, false)} className="card p-5 space-y-4">
      {CHAMPS.map((c) => (
        <label key={c.nom} className="block">
          <span className="text-sm font-medium text-surface-800">{c.label}</span>
          {c.aide && <span className="block text-xs text-surface-400">{c.aide}</span>}
          <textarea name={c.nom} rows={c.nom === 'commentaires_generaux' ? 3 : 2}
            defaultValue={initial?.[c.nom] || ''}
            className="input-base mt-1.5 font-normal" />
        </label>
      ))}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button type="submit" disabled={!!enCours}
          className="btn-secondary inline-flex items-center gap-1.5 !py-2 !px-4 text-sm disabled:opacity-60">
          {enCours === 'brouillon' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer le brouillon
        </button>
        <button type="button" disabled={!!enCours}
          onClick={(e) => {
            const form = (e.currentTarget as HTMLButtonElement).form!
            const fd = new FormData(form)
            fd.set('session_id', sessionId); fd.set('transmettre', 'true')
            setEnCours('transmettre')
            enregistrerRapportAction(fd).then((r) => {
              setEnCours(null)
              if (r.success) { setFait(true); toast('success', 'Rapport transmis au gestionnaire') }
              else toast('error', r.error || 'Erreur')
            })
          }}
          className="btn-primary inline-flex items-center gap-1.5 !py-2 !px-4 text-sm disabled:opacity-60">
          {enCours === 'transmettre' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Transmettre le rapport
        </button>
      </div>
      <p className="text-2xs text-surface-400 text-right">Une fois transmis, le rapport n&apos;est plus modifiable depuis votre espace.</p>
    </form>
  )
}
