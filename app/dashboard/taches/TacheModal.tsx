'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Loader2, Trash2, Link as LinkIcon, MessageSquare, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createTacheAction, updateTacheAction, deleteTacheAction, addCommentAction } from './actions'

type Status = 'a_faire' | 'en_cours' | 'en_revue' | 'terminee'
type Priorite = 'basse' | 'moyenne' | 'haute' | 'urgente'

interface User {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role?: string
}

interface Tache {
  id: string
  titre: string
  description: string | null
  status: Status
  priorite: Priorite
  assignee_id: string | null
  due_date: string | null
  labels: string[] | null
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  created_at: string
  author: User | null
}

interface Props {
  tache: Tache | null
  defaultStatus: Status
  users: User[]
  currentUserId: string
  onClose: () => void
  onSaved: () => void
}

const ENTITY_TYPES = [
  { value: '', label: 'Aucun' },
  { value: 'lead', label: 'Lead' },
  { value: 'dossier', label: 'Dossier' },
  { value: 'session', label: 'Session' },
  { value: 'client', label: 'Client' },
  { value: 'formation', label: 'Formation' },
] as const

interface Comment {
  id: string
  contenu: string
  created_at: string
  author: User | null
}

export default function TacheModal({ tache, defaultStatus, users, currentUserId, onClose, onSaved }: Props) {
  const [titre, setTitre] = useState(tache?.titre || '')
  const [description, setDescription] = useState(tache?.description || '')
  const [status, setStatus] = useState<Status>(tache?.status || defaultStatus)
  const [priorite, setPriorite] = useState<Priorite>(tache?.priorite || 'moyenne')
  const [assigneeId, setAssigneeId] = useState(tache?.assignee_id || '')
  const [dueDate, setDueDate] = useState(tache?.due_date || '')
  const [labels, setLabels] = useState((tache?.labels || []).join(', '))
  const [entityType, setEntityType] = useState(tache?.entity_type || '')
  const [entityLabel, setEntityLabel] = useState(tache?.entity_label || '')

  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')

  const isEdit = !!tache

  // Load comments when editing
  useEffect(() => {
    if (!tache) return
    fetch(`/api/taches/${tache.id}/comments`).then(async (r) => {
      if (r.ok) {
        const data = await r.json()
        setComments(data.comments || [])
      }
    })
  }, [tache])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim()) {
      setError('Le titre est requis')
      return
    }
    setError(null)

    const fd = new FormData()
    fd.append('titre', titre.trim())
    fd.append('description', description)
    fd.append('priorite', priorite)
    fd.append('assignee_id', assigneeId)
    fd.append('due_date', dueDate)
    fd.append('labels', labels)
    fd.append('entity_type', entityType)
    fd.append('entity_label', entityLabel)
    if (!isEdit) fd.append('status', status)

    startTransition(async () => {
      const result = isEdit
        ? await updateTacheAction(tache!.id, fd)
        : await createTacheAction(fd)
      if (result.success) {
        onSaved()
      } else {
        setError(result.error || 'Erreur')
      }
    })
  }

  const handleDelete = () => {
    if (!tache) return
    startTransition(async () => {
      const result = await deleteTacheAction(tache.id)
      if (result.success) onSaved()
      else setError(result.error || 'Erreur')
    })
  }

  const handleAddComment = () => {
    if (!tache || !newComment.trim()) return
    const contenu = newComment.trim()
    setNewComment('')
    startTransition(async () => {
      const result = await addCommentAction(tache.id, contenu)
      if (result.success) {
        // refetch comments
        const r = await fetch(`/api/taches/${tache.id}/comments`)
        if (r.ok) {
          const data = await r.json()
          setComments(data.comments || [])
        }
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-900/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-modal max-h-[95vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between shrink-0">
          <div>
            <div className="text-base font-heading font-semibold text-surface-900">
              {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
            </div>
            {tache?.author && (
              <div className="text-xs text-surface-400 mt-0.5">
                Créée par {tache.author.first_name || tache.author.email}{' '}
                · {new Date(tache.created_at).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-surface-400 hover:bg-surface-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Titre *</label>
              <input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                autoFocus
                required
                placeholder="Préparer la convocation pour la session du 3 juin"
                className="input-base w-full mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Détails, contexte, étapes…"
                className="input-base w-full mt-1 text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {!isEdit && (
                <div>
                  <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Statut</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="input-base w-full mt-1 text-sm"
                  >
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="en_revue">En revue</option>
                    <option value="terminee">Terminé</option>
                  </select>
                </div>
              )}
              <div className={isEdit ? 'col-span-2' : ''}>
                <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Priorité</label>
                <select
                  value={priorite}
                  onChange={(e) => setPriorite(e.target.value as Priorite)}
                  className="input-base w-full mt-1 text-sm"
                >
                  <option value="basse">Basse</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Assigné à</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="input-base w-full mt-1 text-sm"
                >
                  <option value="">Non assigné</option>
                  <option value={currentUserId}>Moi</option>
                  <optgroup label="Équipe">
                    {users
                      .filter((u) => u.id !== currentUserId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Échéance</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-base w-full mt-1 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">
                Étiquettes <span className="font-normal text-surface-400">(séparées par virgules)</span>
              </label>
              <input
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="urgent, OPCO, Akto"
                className="input-base w-full mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="h-3 w-3" /> Lier à une entité CRM
              </label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="input-base text-sm"
                >
                  {ENTITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  value={entityLabel}
                  onChange={(e) => setEntityLabel(e.target.value)}
                  disabled={!entityType}
                  placeholder="Référence ou nom"
                  className="input-base text-sm col-span-2 disabled:bg-surface-50 disabled:text-surface-400"
                />
              </div>
            </div>

            {error && <div className="text-xs text-rose-600">{error}</div>}
          </form>

          {/* Comments (only when editing) */}
          {isEdit && (
            <div className="px-5 pb-5 border-t border-surface-200 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-surface-500" />
                <span className="text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Activité ({comments.length})
                </span>
              </div>

              <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-xs text-surface-400 italic">Aucun commentaire pour le moment.</div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <div className="h-7 w-7 rounded-full bg-surface-200 text-surface-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {(c.author?.first_name?.[0] || c.author?.email?.[0] || '?').toUpperCase()}
                        {(c.author?.last_name?.[0] || '').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-surface-500">
                          <span className="font-medium text-surface-800">
                            {[c.author?.first_name, c.author?.last_name].filter(Boolean).join(' ') || c.author?.email}
                          </span>
                          {' · '}
                          {new Date(c.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                        <div className="text-sm text-surface-800 mt-0.5 whitespace-pre-wrap break-words">
                          {c.contenu}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  placeholder="Ajouter un commentaire…"
                  className="input-base flex-1 text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleAddComment()
                    }
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isPending}
                  className="px-3 rounded-lg bg-surface-900 hover:bg-surface-800 text-white disabled:opacity-50"
                  title="Envoyer (Cmd/Ctrl+Enter)"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-200 flex items-center justify-between gap-2 bg-surface-50/60 shrink-0">
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-rose-700">Supprimer définitivement ?</span>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-2.5 py-1 rounded-md bg-rose-600 text-white font-semibold"
                >
                  Oui
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-md border border-surface-200 text-surface-600"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            )
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-surface-200 text-sm font-medium text-surface-600 hover:bg-white"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !titre.trim()}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer la tâche'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
