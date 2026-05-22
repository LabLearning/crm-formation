'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Loader2, Trash2, Store } from 'lucide-react'

export default function FranchiseLogoClient({ franchiseId, logoUrl }: { franchiseId: string; logoUrl: string | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/franchises/${franchiseId}/upload-logo`, { method: 'POST', body: fd })
    setBusy(false)
    if (res.ok) router.refresh()
    else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Erreur lors de l\'upload')
    }
  }

  const remove = async () => {
    if (!confirm('Supprimer le logo de la franchise ?')) return
    setBusy(true)
    const res = await fetch(`/api/franchises/${franchiseId}/upload-logo`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-14 w-14 rounded-xl border border-surface-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo franchise" className="h-full w-full object-contain p-1" />
        ) : (
          <Store className="h-6 w-6 text-surface-300" />
        )}
      </div>
      <div>
        <div className="text-xs font-semibold text-surface-700">Logo de la franchise</div>
        <div className="text-[11px] text-surface-400 mb-1.5">Affiché en co-branding sur le portail (Lab Learning × logo). PNG, JPG, SVG, WebP.</div>
        <div className="flex items-center gap-2">
          <button onClick={() => inputRef.current?.click()} disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-surface-200 text-surface-700 hover:bg-surface-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {logoUrl ? 'Remplacer' : 'Ajouter un logo'}
          </button>
          {logoUrl && (
            <button onClick={remove} disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" /> Retirer
            </button>
          )}
        </div>
        {error && <div className="text-[11px] text-rose-600 mt-1">{error}</div>}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      </div>
    </div>
  )
}
