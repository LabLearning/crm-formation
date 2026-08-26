'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Paperclip, Trash2 } from '@/components/ui/icons'
import { useToast } from '@/components/ui'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES_FORMATEUR } from '@/lib/types/document'
import { uploadFormateurDocAction, deleteFormateurDocAction } from './documents-actions'

/** Bouton de suppression d'un document déposé par le formateur */
export function FormateurDocDelete({ docId, token, formateurId }: { docId: string; token: string; formateurId?: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  async function remove() {
    if (!confirm('Supprimer ce document ?')) return
    setLoading(true)
    const r = await deleteFormateurDocAction(docId, token, formateurId)
    setLoading(false)
    if (r.success) { toast('success', 'Document supprimé'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }
  return (
    <button onClick={remove} disabled={loading} title="Supprimer"
      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-surface-400 hover:bg-danger-50 hover:text-danger-600 transition-colors disabled:opacity-50">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}

/**
 * Dépôt par le formateur de ses pièces administratives (URSSAF, Kbis, NDA,
 * responsabilité civile, régularité fiscale…). Fonctionne en espace connecté
 * comme en portail (le token identifie le formateur côté action).
 */
export function FormateurDocUpload({ token, formateurId }: { token: string; formateurId?: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<string>('attestation_urssaf')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!file) { toast('error', 'Sélectionnez un fichier'); return }
    setLoading(true)
    const fd = new FormData()
    fd.set('token', token)
    if (formateurId) fd.set('formateur_id', formateurId)
    fd.set('type', type)
    fd.set('file', file)
    fd.set('nom', DOCUMENT_TYPE_LABELS[type as keyof typeof DOCUMENT_TYPE_LABELS] || file.name)
    const r = await uploadFormateurDocAction(fd)
    setLoading(false)
    if (r.success) {
      toast('success', 'Document ajouté')
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } else {
      toast('error', r.error || 'Erreur')
    }
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="text-sm font-semibold text-surface-900 mb-1">Ajouter un document</div>
      <p className="text-xs text-surface-500 mb-4">Déposez vos pièces administratives : attestation URSSAF, Kbis, NDA, responsabilité civile, régularité fiscale…</p>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-700 focus:outline-none focus:border-surface-300 sm:w-64"
        >
          {DOCUMENT_TYPES_FORMATEUR.map((t) => (
            <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <label className="flex-1 flex items-center gap-2 rounded-xl border border-dashed border-surface-300 bg-surface-50/60 px-3 py-2.5 text-sm text-surface-500 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="truncate">{file ? file.name : 'Choisir un fichier (PDF, image…)'}</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <button
          onClick={submit}
          disabled={loading || !file}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-900 text-white text-sm font-medium hover:bg-surface-800 disabled:opacity-50 transition-colors shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Ajouter
        </button>
      </div>
    </div>
  )
}
