'use client'

import { useState, useRef, useTransition } from 'react'
import { Camera, Clock, LogIn, LogOut, Loader2, CheckCircle2, Image } from 'lucide-react'
import { pointerArriveeAction, pointerDepartAction } from './actions'
import { cn } from '@/lib/utils'

interface TodayPointage {
  id: string
  heure_arrivee: string | null
  heure_depart: string | null
  photo_arrivee_url: string | null
  photo_depart_url: string | null
  session: { reference: string; formation: { intitule: string } | null } | null
}

interface SessionOption {
  id: string
  reference: string
  formation: { intitule: string } | null
}

interface PointageButtonProps {
  todayPointages: TodayPointage[]
  sessionsToday: SessionOption[]
}

function formatHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function calcDuree(arrivee: string, depart: string): string {
  const diff = new Date(depart).getTime() - new Date(arrivee).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}h${String(m).padStart(2, '0')}`
}

export function PointageButton({ todayPointages, sessionsToday }: PointageButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState(sessionsToday.length === 1 ? sessionsToday[0].id : '')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [mode, setMode] = useState<'idle' | 'capture_arrivee' | 'capture_depart'>('idle')
  const [activePointageId, setActivePointageId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Trouver le pointage en cours (arrivée faite, départ pas encore)
  const pointageEnCours = todayPointages.find(p => p.heure_arrivee && !p.heure_depart)
  // Sessions déjà pointées (arrivée + départ faits)
  const sessionsDone = new Set(todayPointages.filter(p => p.heure_arrivee && p.heure_depart).map(p => (p.session as any)?.reference))
  // Sessions avec arrivée faite
  const sessionsStarted = new Set(todayPointages.filter(p => p.heure_arrivee).map(p => (p as any).session_id))

  function handleCaptureClick(type: 'arrivee' | 'depart', pointageId?: string) {
    setError(null)
    setPhotoPreview(null)
    setMode(type === 'arrivee' ? 'capture_arrivee' : 'capture_depart')
    if (pointageId) setActivePointageId(pointageId)
    // Ouvrir la caméra
    setTimeout(() => fileRef.current?.click(), 100)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Compression : resize à max 800px
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 800
        const scale = Math.min(1, maxW / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL('image/jpeg', 0.7)
        setPhotoPreview(compressed)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit() {
    if (!photoPreview) return
    setError(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set('photo', photoPreview)

      let result
      if (mode === 'capture_arrivee') {
        formData.set('session_id', selectedSession)
        result = await pointerArriveeAction(formData)
      } else {
        formData.set('pointage_id', activePointageId || pointageEnCours?.id || '')
        result = await pointerDepartAction(formData)
      }

      if (!result.success) {
        setError(result.error || 'Erreur')
      } else {
        setMode('idle')
        setPhotoPreview(null)
      }
    })
  }

  // État : capture photo en cours
  if (mode !== 'idle') {
    return (
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', mode === 'capture_arrivee' ? 'bg-emerald-100' : 'bg-red-100')}>
            <Camera className={cn('h-5 w-5', mode === 'capture_arrivee' ? 'text-emerald-600' : 'text-red-600')} />
          </div>
          <div>
            <div className="text-sm font-semibold text-surface-900">
              {mode === 'capture_arrivee' ? 'Photo d\'arrivée' : 'Photo de départ'}
            </div>
            <div className="text-xs text-surface-500">Prenez une photo comme preuve de pointage</div>
          </div>
        </div>

        {/* Input caméra caché */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handlePhotoChange}
          className="hidden"
        />

        {/* Aperçu photo */}
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="Aperçu" className="w-full h-48 object-cover rounded-xl" />
            <button
              onClick={() => { setPhotoPreview(null); fileRef.current?.click() }}
              className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-surface-700"
            >
              Reprendre
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-48 rounded-xl border-2 border-dashed border-surface-300 flex flex-col items-center justify-center gap-2 hover:bg-surface-50 transition-colors"
          >
            <Image className="h-8 w-8 text-surface-400" />
            <span className="text-sm text-surface-500">Appuyez pour prendre la photo</span>
          </button>
        )}

        {error && (
          <div className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setMode('idle'); setPhotoPreview(null) }}
            className="flex-1 py-3 rounded-xl border border-surface-200 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!photoPreview || isPending}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors',
              mode === 'capture_arrivee' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
              (!photoPreview || isPending) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Valider le pointage
          </button>
        </div>
      </div>
    )
  }

  // État : pointage en cours (arrivée faite, attente départ)
  if (pointageEnCours) {
    return (
      <div className="card overflow-hidden">
        <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Pointé à {formatHeure(pointageEnCours.heure_arrivee!)}</span>
          </div>
          <span className="text-xs text-emerald-600 font-mono">
            {pointageEnCours.session?.formation?.intitule || pointageEnCours.session?.reference}
          </span>
        </div>
        <div className="p-5">
          <button
            onClick={() => handleCaptureClick('depart', pointageEnCours.id)}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-base flex items-center justify-center gap-3 transition-colors active:scale-[0.98]"
          >
            <LogOut className="h-5 w-5" />
            Pointer mon départ
          </button>
        </div>
      </div>
    )
  }

  // État : toutes les sessions du jour sont terminées
  if (todayPointages.length > 0 && todayPointages.every(p => p.heure_arrivee && p.heure_depart)) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-surface-900">Journée terminée</div>
            <div className="text-xs text-surface-500">Tous les pointages sont complétés</div>
          </div>
        </div>
        <div className="space-y-2">
          {todayPointages.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50">
              <div className="text-sm text-surface-700 truncate flex-1">
                {p.session?.formation?.intitule || p.session?.reference}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs">
                <span className="text-emerald-600 font-mono">{formatHeure(p.heure_arrivee!)}</span>
                <span className="text-surface-300">—</span>
                <span className="text-red-600 font-mono">{formatHeure(p.heure_depart!)}</span>
                <span className="text-surface-500 font-bold">{calcDuree(p.heure_arrivee!, p.heure_depart!)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // État : pas encore pointé — bouton d'arrivée
  // Filtrer les sessions pas encore pointées
  const sessionsDisponibles = sessionsToday.filter(s => !sessionsStarted.has(s.id))

  if (sessionsDisponibles.length === 0) {
    return null // Pas de session aujourd'hui
  }

  return (
    <div className="card p-5 space-y-4">
      {sessionsDisponibles.length > 1 && (
        <div>
          <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 block">
            Session du jour
          </label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="input-base"
          >
            <option value="">Sélectionner la session</option>
            {sessionsDisponibles.map(s => (
              <option key={s.id} value={s.id}>
                {s.formation?.intitule || s.reference}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        onClick={() => {
          if (!selectedSession) { setError('Veuillez sélectionner une session'); return }
          handleCaptureClick('arrivee')
        }}
        className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-3 transition-colors active:scale-[0.98]"
      >
        <LogIn className="h-5 w-5" />
        Pointer mon arrivée
      </button>

      <div className="flex items-center gap-2 justify-center">
        <Clock className="h-3.5 w-3.5 text-surface-400" />
        <span className="text-xs text-surface-400">
          {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — Photo obligatoire
        </span>
      </div>
    </div>
  )
}
