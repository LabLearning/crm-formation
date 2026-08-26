'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Clock, LogIn, LogOut, Loader2, CheckCircle2, Image as ImageIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { pointerArriveeSessionAction, pointerDepartSessionAction } from './pointage-actions'

interface TodayPointage {
  id: string
  heure_arrivee: string | null
  heure_depart: string | null
}

const fmtH = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
function duree(a: string, d: string) {
  const diff = new Date(d).getTime() - new Date(a).getTime()
  return `${Math.floor(diff / 3600000)}h${String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')}`
}

/**
 * Pointage du formateur pour CETTE session, jour courant (arrivée/départ +
 * photo obligatoire). Fonctionne en espace connecté et en portail (token).
 */
export function SessionPointage({ token, sessionId, pointage }: { token: string; sessionId: string; pointage: TodayPointage | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'idle' | 'arrivee' | 'depart'>('idle')
  const [photo, setPhoto] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const arrivee = pointage?.heure_arrivee || null
  const depart = pointage?.heure_depart || null

  function openCapture(m: 'arrivee' | 'depart') {
    setError(null); setPhoto(null); setMode(m)
    setTimeout(() => fileRef.current?.click(), 100)
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 800 / img.width)
        canvas.width = img.width * scale; canvas.height = img.height * scale
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        setPhoto(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  function submit() {
    if (!photo) return
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('token', token); fd.set('photo', photo); fd.set('session_id', sessionId)
      let r
      if (mode === 'arrivee') r = await pointerArriveeSessionAction(fd)
      else { fd.set('pointage_id', pointage?.id || ''); r = await pointerDepartSessionAction(fd) }
      if (!r.success) setError(r.error || 'Erreur')
      else { setMode('idle'); setPhoto(null); router.refresh() }
    })
  }

  // Capture photo en cours
  if (mode !== 'idle') {
    return (
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', mode === 'arrivee' ? 'bg-emerald-100' : 'bg-red-100')}>
            <Camera className={cn('h-5 w-5', mode === 'arrivee' ? 'text-emerald-600' : 'text-red-600')} />
          </div>
          <div>
            <div className="text-sm font-semibold text-surface-900">{mode === 'arrivee' ? "Photo d'arrivée" : 'Photo de départ'}</div>
            <div className="text-xs text-surface-500">Preuve de pointage — photo obligatoire</div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={onPhoto} className="hidden" />
        {photo ? (
          <div className="relative">
            <img src={photo} alt="Aperçu" className="w-full h-48 object-cover rounded-xl" />
            <button onClick={() => { setPhoto(null); fileRef.current?.click() }}
              className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 rounded-lg text-xs font-medium text-surface-700">Reprendre</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full h-48 rounded-xl border-2 border-dashed border-surface-300 flex flex-col items-center justify-center gap-2 hover:bg-surface-50">
            <ImageIcon className="h-8 w-8 text-surface-400" />
            <span className="text-sm text-surface-500">Appuyez pour prendre la photo</span>
          </button>
        )}
        {error && <div className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-4 py-3">{error}</div>}
        <div className="flex gap-3">
          <button onClick={() => { setMode('idle'); setPhoto(null) }} className="flex-1 py-3 rounded-xl border border-surface-200 text-sm font-medium text-surface-600 hover:bg-surface-50">Annuler</button>
          <button onClick={submit} disabled={!photo || isPending}
            className={cn('flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2',
              mode === 'arrivee' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700', (!photo || isPending) && 'opacity-50')}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Valider
          </button>
        </div>
      </div>
    )
  }

  // Terminé (arrivée + départ)
  if (arrivee && depart) {
    return (
      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-surface-800">Pointage du jour complété</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs">
          <span className="text-emerald-600 font-mono">{fmtH(arrivee)}</span>
          <span className="text-surface-300">—</span>
          <span className="text-red-600 font-mono">{fmtH(depart)}</span>
          <span className="text-surface-700 font-bold ml-1">{duree(arrivee, depart)}</span>
        </div>
      </div>
    )
  }

  // Arrivée faite, en attente du départ
  if (arrivee) {
    return (
      <div className="card overflow-hidden">
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">Arrivée pointée à {fmtH(arrivee)}</span>
        </div>
        <div className="p-4">
          <button onClick={() => openCapture('depart')}
            className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-3 active:scale-[0.98]">
            <LogOut className="h-5 w-5" /> Pointer mon départ
          </button>
        </div>
      </div>
    )
  }

  // Pas encore pointé
  return (
    <div className="card p-4 space-y-3">
      {error && <div className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-4 py-3">{error}</div>}
      <button onClick={() => openCapture('arrivee')}
        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-3 active:scale-[0.98]">
        <LogIn className="h-5 w-5" /> Pointer mon arrivée
      </button>
      <div className="flex items-center gap-2 justify-center">
        <Clock className="h-3.5 w-3.5 text-surface-400" />
        <span className="text-xs text-surface-400">Photo obligatoire comme preuve de présence</span>
      </div>
    </div>
  )
}
