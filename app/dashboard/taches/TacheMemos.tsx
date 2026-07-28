'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Mic, Square, Trash2, Loader2, Play } from 'lucide-react'
import { useToast } from '@/components/ui'
import { addTacheMemoAction, deleteTacheMemoAction } from './actions'

interface Memo {
  id: string
  url: string | null
  duree_secondes: number | null
  created_at: string
  author?: { first_name: string; last_name: string } | null
}

function fmtDuree(s: number | null) {
  const t = Math.max(0, Math.round(s || 0))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function TacheMemos({ tacheId }: { tacheId: string }) {
  const { toast } = useToast()
  const [memos, setMemos] = useState<Memo[]>([])
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [pending, start] = useTransition()

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const startedAtRef = useRef(0)

  async function load() {
    try {
      const r = await fetch(`/api/taches/${tacheId}/memos`)
      if (r.ok) { const d = await r.json(); setMemos(d.memos || []) }
    } catch { /* silencieux */ }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [tacheId])
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const duree = (Date.now() - startedAtRef.current) / 1000
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          start(async () => {
            const res = await addTacheMemoAction(tacheId, base64, duree)
            if (res.success) { toast('success', 'Mémo vocal ajouté'); load() }
            else toast('error', res.error || 'Erreur')
          })
        }
        reader.readAsDataURL(blob)
      }
      mediaRef.current = mr
      startedAtRef.current = Date.now()
      mr.start()
      setRecording(true); setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } catch {
      toast('error', "Micro non autorisé — vérifiez les permissions du navigateur")
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
    mediaRef.current?.stop()
  }

  function remove(id: string) {
    if (!confirm('Supprimer ce mémo vocal ?')) return
    start(async () => {
      const r = await deleteTacheMemoAction(id)
      if (r.success) { toast('success', 'Mémo supprimé'); setMemos((m) => m.filter((x) => x.id !== id)) }
      else toast('error', r.error || 'Erreur')
    })
  }

  return (
    <div className="space-y-2.5">
      {/* Enregistreur */}
      {recording ? (
        <button type="button" onClick={stopRecording}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-danger-600 text-white text-sm font-semibold hover:bg-danger-700 transition-colors">
          <Square className="h-4 w-4" /> Arrêter · {fmtDuree(elapsed)}
          <span className="ml-1 h-2 w-2 rounded-full bg-white animate-pulse" />
        </button>
      ) : (
        <button type="button" onClick={startRecording} disabled={pending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-surface-200 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50 transition-colors">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4 text-brand-500" />}
          {pending ? 'Envoi…' : 'Enregistrer un mémo vocal'}
        </button>
      )}

      {/* Liste des mémos */}
      {memos.length > 0 && (
        <div className="space-y-2">
          {memos.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 rounded-xl bg-surface-50">
              <div className="h-7 w-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                <Play className="h-3.5 w-3.5 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                {m.url ? (
                  <audio controls src={m.url} className="w-full h-8" />
                ) : (
                  <span className="text-xs text-surface-400">Audio indisponible</span>
                )}
                <div className="text-[10px] text-surface-400 mt-0.5">
                  {m.author && `${m.author.first_name} ${m.author.last_name} · `}
                  {fmtDate(m.created_at)}{m.duree_secondes ? ` · ${fmtDuree(m.duree_secondes)}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => remove(m.id)} className="h-7 w-7 flex items-center justify-center rounded-lg text-surface-400 hover:bg-danger-50 hover:text-danger-600 shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
