'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Upload, Loader2, FileText, Download, X } from 'lucide-react'
import { useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { genererDocumentBrandeAction } from '@/app/mon-espace/studio/actions'

interface SessionRef { id: string; libelle: string; franchise: string | null }
interface DocGenere { id: string; nom: string; created_at: string }

/**
 * Studio : le formateur photographie ses notes/affichages en mission, décrit
 * ce qu'il veut, et récupère un PDF propre aux couleurs de la franchise.
 * (Sparkles assumé : c'est une vraie feature IA.)
 */
export function StudioClient({ sessions, generes }: {
  sessions: SessionRef[]
  generes: DocGenere[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [sessionId, setSessionId] = useState(sessions[0]?.id || '')
  const [fichiers, setFichiers] = useState<File[]>([])
  const [enCours, setEnCours] = useState(false)
  const [dernierDoc, setDernierDoc] = useState<string | null>(null)

  const sessionChoisie = sessions.find((s) => s.id === sessionId)

  function ajouterFichiers(list: FileList | null) {
    if (!list) return
    const ok = (f: File) => /^image\/(jpeg|png|webp)$/.test(f.type)
      || f.type === 'application/pdf'
      || /\.(pdf|docx|xlsx|xls|csv)$/i.test(f.name)
    const nouveaux = Array.from(list).filter(ok)
    if (nouveaux.length !== list.length) toast('error', 'Formats acceptés : photos, PDF, Word (.docx), Excel')
    setFichiers((prev) => [...prev, ...nouveaux].slice(0, 5))
  }

  async function generer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnCours(true); setDernierDoc(null)
    const fd = new FormData(e.currentTarget)
    fd.set('session_id', sessionId)
    fd.delete('fichiers')
    for (const f of fichiers) fd.append('fichiers', f)
    const r = await genererDocumentBrandeAction(fd)
    setEnCours(false)
    if (r.success && r.data?.documentId) {
      toast('success', 'Document généré et rangé dans la session')
      setDernierDoc(r.data.documentId)
      setFichiers([])
      router.refresh()
    } else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-heading font-bold text-surface-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-500" /> Studio documents
        </h1>
        <p className="text-sm text-surface-500 mt-1">
          Photographiez vos notes, tableaux ou affichages pris en mission : l&apos;IA les transforme en
          document propre aux couleurs de la franchise, rangé dans les documents de la session.
        </p>
      </div>

      <form onSubmit={generer} className="card p-5 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-surface-800">Session concernée</span>
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="input-base mt-1.5">
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
          {sessionChoisie?.franchise && (
            <span className="block text-xs text-brand-600 mt-1">
              Document aux couleurs de {sessionChoisie.franchise}
            </span>
          )}
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-surface-800">Titre du document</span>
            <input name="titre" placeholder="ex. Plan de nettoyage cuisine" className="input-base mt-1.5" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-surface-800">Consignes (optionnel)</span>
            <input name="consignes" placeholder="ex. Un tableau par zone, consignes en liste" className="input-base mt-1.5" />
          </label>
        </div>

        {/* Upload photos */}
        <div>
          <span className="text-sm font-medium text-surface-800">Vos documents sources (5 max — photos, PDF, Word, Excel)</span>
          <label className="mt-1.5 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-surface-200 hover:border-brand-300 transition-colors py-8 cursor-pointer">
            <Upload className="h-6 w-6 text-surface-400" />
            <span className="text-sm text-surface-500">Photo, PDF, Word ou Excel</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.docx,.xlsx,.xls,.csv" multiple
              className="hidden" onChange={(e) => { ajouterFichiers(e.target.files); e.target.value = '' }} />
          </label>
          {fichiers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {fichiers.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 pl-3 pr-1.5 py-1 text-xs text-surface-700">
                  {f.name.slice(0, 24)}{f.name.length > 24 ? '…' : ''}
                  <button type="button" onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))}
                    className="h-5 w-5 rounded-full hover:bg-surface-200 flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-surface-400">La génération prend 15 à 30 secondes.</p>
          <button type="submit" disabled={enCours || !sessionId}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-900 text-white text-sm font-semibold hover:bg-surface-800 disabled:opacity-50">
            {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {enCours ? 'Génération…' : 'Générer le document'}
          </button>
        </div>

        {dernierDoc && (
          <a href={`/api/documents/${dernierDoc}/download`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold py-3 hover:bg-emerald-100 transition-colors">
            <Download className="h-4 w-4" /> Télécharger le document généré
          </a>
        )}
      </form>

      {generes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 text-xs font-semibold text-surface-500 uppercase tracking-wider">
            Mes documents générés
          </div>
          <div className="divide-y divide-surface-50">
            {generes.map((d) => (
              <a key={d.id} href={`/api/documents/${d.id}/download`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors">
                <FileText className="h-4 w-4 text-brand-500 shrink-0" />
                <span className="flex-1 text-sm text-surface-900 truncate">{d.nom}</span>
                <span className="text-xs text-surface-400 shrink-0">{formatDate(d.created_at, { day: 'numeric', month: 'short' })}</span>
                <Download className="h-4 w-4 text-surface-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
