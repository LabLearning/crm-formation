'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Save, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button, Badge, Select, useToast } from '@/components/ui'
import { themeOf } from '@/lib/branches'
import { formatDate } from '@/lib/utils'
import { saveRecueilAction } from './recueil-actions'

interface Question { id: string; label: string; type?: string }
interface Template { id: string; theme: string; nom: string; questions: Question[] }
interface Recueil { template_id: string | null; theme: string | null; reponses: Record<string, string>; statut: string; date_recueil: string | null }

const THEME_LABELS: Record<string, string> = {
  hygiene: 'Hygiène & sécurité alimentaire',
  prevention: 'Prévention & sécurité au travail',
  management: 'Management, gestion & performance',
  metier: 'Cœur de métier',
}

export function SessionRecueil({ sessionId, formationIntitule, templates, initial }: {
  sessionId: string
  formationIntitule: string
  templates: Template[]
  initial: Recueil | null
}) {
  const { toast } = useToast()
  const router = useRouter()

  const detectedTheme = initial?.theme || themeOf(formationIntitule || '')
  const [theme, setTheme] = useState<string>(detectedTheme)
  const template = useMemo(() => templates.find((t) => t.theme === theme) || null, [templates, theme])
  const [reponses, setReponses] = useState<Record<string, string>>(initial?.reponses || {})
  const [saving, setSaving] = useState(false)
  const [statut, setStatut] = useState<string>(initial?.statut || 'brouillon')

  const questions = template?.questions || []
  const filled = questions.filter((q) => (reponses[q.id] || '').trim()).length

  async function save(newStatut: 'brouillon' | 'complete') {
    if (newStatut === 'complete' && filled < Math.ceil(questions.length / 2)) {
      toast('error', 'Complétez au moins la moitié des champs avant de valider')
      return
    }
    setSaving(true)
    const r = await saveRecueilAction({ sessionId, templateId: template?.id || null, theme, reponses, statut: newStatut })
    if (r.success) { toast('success', newStatut === 'complete' ? 'Recueil du besoin complété' : 'Brouillon enregistré'); setStatut(newStatut); router.refresh() }
    else toast('error', r.error || 'Erreur')
    setSaving(false)
  }

  if (templates.length === 0) {
    return (
      <div className="card p-6 border-warning-200 bg-warning-50/40 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning-600 shrink-0 mt-0.5" />
        <div className="text-sm text-surface-700">
          <div className="font-semibold text-surface-900">Modèles de recueil non initialisés</div>
          Applique la migration <code>105_recueil_besoin.sql</code> puis lance le seed des modèles par thème.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading font-semibold text-surface-900 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-brand-500" /> Recueil du besoin</h3>
          <p className="text-sm text-surface-500 mt-0.5">Analyse du besoin du commanditaire — indicateur Qualiopi 4.</p>
        </div>
        {statut === 'complete'
          ? <Badge variant="success">Complété{initial?.date_recueil ? ` le ${formatDate(initial.date_recueil, { day: 'numeric', month: 'short' })}` : ''}</Badge>
          : <Badge variant="warning">Brouillon</Badge>}
      </div>

      <div className="flex items-center gap-3">
        <Select
          id="theme" label="Modèle (thème détecté automatiquement)"
          value={theme} onChange={(e) => setTheme(e.target.value)}
          options={templates.map((t) => ({ value: t.theme, label: `${THEME_LABELS[t.theme] || t.theme}` }))}
        />
        <div className="text-xs text-surface-400 pt-6 whitespace-nowrap">{filled}/{questions.length} champs</div>
      </div>

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-surface-700 mb-1">{q.label}</label>
            <textarea
              rows={2} className="input-base resize-none"
              value={reponses[q.id] || ''}
              onChange={(e) => setReponses((prev) => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="…"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-1 border-t border-surface-100">
        <Button variant="secondary" onClick={() => save('brouillon')} isLoading={saving} icon={<Save className="h-4 w-4" />}>Enregistrer le brouillon</Button>
        <Button onClick={() => save('complete')} isLoading={saving} icon={<CheckCircle2 className="h-4 w-4" />}>Marquer comme complété</Button>
      </div>
    </div>
  )
}
