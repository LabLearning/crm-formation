'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, Plus, Trash2, ExternalLink, Scale, Briefcase, Lightbulb, Accessibility, Save, Sparkles, CheckCircle2, Pencil } from 'lucide-react'
import { Button, Badge, Modal, Input, Select, useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { createVeilleAction, deleteVeilleAction, generateVeilleSuggestionsAction, updateVeilleAction, validateVeilleAction } from './actions'
import type { VeilleRow } from './page'

const TYPES = [
  { value: 'legale', label: 'Légale & réglementaire', ind: 23, Icon: Scale, hint: 'Legifrance, OPCO, décrets, RNQ…' },
  { value: 'metier', label: 'Métier & emploi', ind: 24, Icon: Briefcase, hint: 'Évolutions des métiers de bouche, besoins en compétences' },
  { value: 'pedagogique', label: 'Pédagogique & techno', ind: 25, Icon: Lightbulb, hint: 'Nouvelles méthodes, outils, LMS, IA…' },
  { value: 'handicap', label: 'Handicap', ind: 26, Icon: Accessibility, hint: 'Ressources, partenariats, adaptations PSH' },
] as const

type VeilleType = typeof TYPES[number]['value']
const typeConf = (t: string) => TYPES.find((x) => x.value === t) || TYPES[0]

export function VeilleList({ veilles }: { veilles: VeilleRow[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [filter, setFilter] = useState<VeilleType | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editVeille, setEditVeille] = useState<VeilleRow | null>(null)
  const [defaultType, setDefaultType] = useState<VeilleType>('legale')
  const [generating, setGenerating] = useState(false)

  const isDraft = (v: VeilleRow) => v.statut === 'brouillon'
  const drafts = useMemo(() => veilles.filter(isDraft), [veilles])

  // Compteurs par type = uniquement les veilles VALIDÉES (celles qui comptent pour Qualiopi)
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const v of veilles) if (!isDraft(v)) m[v.type] = (m[v.type] || 0) + 1
    return m
  }, [veilles])

  const validated = veilles.filter((v) => !isDraft(v))
  const shown = filter === 'all' ? validated : validated.filter((v) => v.type === filter)

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée de veille ?')) return
    const r = await deleteVeilleAction(id)
    if (r.success) { toast('success', 'Entrée supprimée'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  async function handleValidate(id: string) {
    const r = await validateVeilleAction(id)
    if (r.success) { toast('success', 'Veille validée'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  async function handleGenerate() {
    setGenerating(true)
    const r = await generateVeilleSuggestionsAction(1)
    if (r.success) { toast('success', `${r.data?.inserted || 0} brouillon(s) IA à valider`); router.refresh() }
    else toast('error', r.error || 'Erreur IA')
    setGenerating(false)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading flex items-center gap-2">
            <Compass className="h-6 w-6 text-brand-500" /> Veille
          </h1>
          <p className="text-surface-500 mt-1 text-sm">Critère 6 — indicateurs 23 · 24 · 25 · 26. Registre exigé par Qualiopi.</p>
        </div>
        <div className="flex gap-2">
          <Button className="btn-ia" onClick={handleGenerate} isLoading={generating} icon={<Sparkles className="h-4 w-4" />}>
            Suggérer par IA
          </Button>
          <Button onClick={() => { setDefaultType(filter === 'all' ? 'legale' : filter); setAddOpen(true) }} icon={<Plus className="h-4 w-4" />}>
            Ajouter une veille
          </Button>
        </div>
      </div>

      {/* Brouillons IA à valider */}
      {drafts.length > 0 && (
        <div className="card p-5 mb-6 border-brand-200 bg-brand-50/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-heading font-semibold text-surface-900">Brouillons IA à valider</h2>
            <Badge variant="info">{drafts.length}</Badge>
          </div>
          <p className="text-xs text-surface-500 mb-3">Vérifie et corrige chaque brouillon (sources, chiffres), puis valide. Seules les veilles validées comptent pour Qualiopi.</p>
          <div className="space-y-2">
            {drafts.map((v) => {
              const c = typeConf(v.type)
              return (
                <div key={v.id} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-brand-100">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center"><c.Icon className="h-4 w-4 text-brand-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="info">Ind. {c.ind}</Badge>
                      {v.source && <span className="text-2xs text-surface-500">{v.source}</span>}
                    </div>
                    <div className="text-sm font-semibold text-surface-900 mt-0.5">{v.titre}</div>
                    {v.resume && <div className="text-xs text-surface-600 mt-0.5">{v.resume}</div>}
                    {v.action && <div className="text-2xs text-success-700 mt-1"><span className="font-semibold">Action :</span> {v.action}</div>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" onClick={() => handleValidate(v.id)} icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Valider</Button>
                    <button onClick={() => handleDelete(v.id)} className="text-2xs text-surface-400 hover:text-danger-500">Rejeter</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Compteurs par type */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {TYPES.map((t) => {
          const n = counts[t.value] || 0
          const active = filter === t.value
          return (
            <button key={t.value} onClick={() => setFilter(active ? 'all' : t.value)}
              className={`card p-4 text-left transition-colors ${active ? 'ring-2 ring-brand-400' : 'hover:bg-surface-50/40'}`}>
              <div className="flex items-center justify-between">
                <t.Icon className={`h-5 w-5 ${n > 0 ? 'text-brand-600' : 'text-warning-500'}`} />
                <span className={`text-2xl font-heading font-bold ${n > 0 ? 'text-surface-900' : 'text-warning-500'}`}>{n}</span>
              </div>
              <div className="text-xs font-semibold text-surface-800 mt-2">Ind. {t.ind} — {t.label}</div>
              <div className="text-2xs text-surface-400 mt-0.5 leading-snug">{t.hint}</div>
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <Compass className="h-10 w-10 text-surface-300 mx-auto mb-3" />
          <div className="text-sm font-medium text-surface-700">Aucune veille enregistrée{filter !== 'all' ? ' pour ce type' : ''}</div>
          <p className="text-xs text-surface-500 mt-1 max-w-md mx-auto">
            L'auditeur vérifie que vous suivez et exploitez une veille. Enregistrez au moins quelques entrées par type
            (une source suivie, ce que vous en avez tiré, l'action déclenchée).
          </p>
          <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>Ajouter une veille</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((v) => {
            const c = typeConf(v.type)
            return (
              <div key={v.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center"><c.Icon className="h-4 w-4 text-brand-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="info">Ind. {c.ind}</Badge>
                      <span className="text-2xs text-surface-400">{formatDate(v.date_veille, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {v.source && <span className="text-2xs text-surface-500">· {v.source}</span>}
                    </div>
                    <div className="text-sm font-semibold text-surface-900 mt-1">{v.titre}</div>
                    {v.resume && <div className="text-xs text-surface-600 mt-1">{v.resume}</div>}
                    <div className="grid sm:grid-cols-2 gap-2 mt-2">
                      {v.impact && <div className="text-xs text-surface-600 p-2 rounded-lg bg-surface-50"><span className="font-semibold text-surface-700">Impact :</span> {v.impact}</div>}
                      {v.action && <div className="text-xs text-surface-600 p-2 rounded-lg bg-success-50/60"><span className="font-semibold text-success-700">Action :</span> {v.action}</div>}
                    </div>
                    {v.lien && (
                      <a href={v.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-2xs font-medium text-brand-600 hover:underline">
                        <ExternalLink className="h-3 w-3" /> Source
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => setEditVeille(v)} className="p-1.5 text-surface-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(v.id)} className="p-1.5 text-surface-400 hover:text-danger-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Ajouter une veille" size="lg">
        <VeilleForm defaultType={defaultType} onDone={() => { setAddOpen(false); router.refresh() }} />
      </Modal>

      <Modal isOpen={!!editVeille} onClose={() => setEditVeille(null)} title="Modifier la veille" size="lg">
        {editVeille && <VeilleForm defaultType={editVeille.type as VeilleType} initial={editVeille} onDone={() => { setEditVeille(null); router.refresh() }} />}
      </Modal>
    </div>
  )
}

function VeilleForm({ defaultType, initial, onDone }: { defaultType: VeilleType; initial?: VeilleRow | null; onDone: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const r = initial ? await updateVeilleAction(initial.id, fd) : await createVeilleAction(fd)
    if (r.success) { toast('success', initial ? 'Veille modifiée' : 'Veille enregistrée'); onDone() }
    else toast('error', r.error || 'Erreur')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Select name="type" label="Type de veille *" defaultValue={defaultType}
          options={TYPES.map((t) => ({ value: t.value, label: `Ind. ${t.ind} — ${t.label}` }))} />
        <Input name="date_veille" type="date" label="Date" defaultValue={initial?.date_veille ? String(initial.date_veille).slice(0, 10) : new Date().toISOString().split('T')[0]} />
      </div>
      <Input name="titre" label="Titre / sujet *" defaultValue={initial?.titre || ''} placeholder="Ex : Nouveau taux de prise en charge OPCO Akto" />
      <Input name="source" label="Source" defaultValue={initial?.source || ''} placeholder="Legifrance, Akto, presse pro, webinaire…" />
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Résumé</label>
        <textarea name="resume" rows={2} className="input-base resize-none" defaultValue={initial?.resume || ''} placeholder="Ce que vous avez observé…" />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Impact sur nos prestations</label>
        <textarea name="impact" rows={2} className="input-base resize-none" defaultValue={initial?.impact || ''} placeholder="En quoi ça nous concerne…" />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Action déclenchée</label>
        <textarea name="action" rows={3} className="input-base resize-none" defaultValue={initial?.action || ''} placeholder="Mise à jour programme, info formateurs…" />
      </div>
      <Input name="lien" label="Lien source (optionnel)" defaultValue={initial?.lien || ''} placeholder="https://…" />
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onDone}>Annuler</Button>
        <Button type="submit" isLoading={loading} icon={<Save className="h-4 w-4" />}>Enregistrer</Button>
      </div>
    </form>
  )
}
