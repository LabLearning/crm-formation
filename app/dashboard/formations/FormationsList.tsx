'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, EyeOff,
  Clock, Users, Euro, GraduationCap, Award, Tag,
} from 'lucide-react'
import { Button, Badge, Modal, useToast } from '@/components/ui'
import { FormationForm } from './FormationForm'
import { deleteFormationAction, toggleFormationAction } from './actions'
import { MODALITE_LABELS, MODALITE_COLORS } from '@/lib/types/formation'
import type { Formation } from '@/lib/types/formation'

interface FormationsListProps {
  formations: Formation[]
  readOnly?: boolean
}

export function FormationsList({ formations, readOnly }: FormationsListProps) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editFormation, setEditFormation] = useState<Formation | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return formations.filter((f) => {
      const matchSearch = f.intitule.toLowerCase().includes(search.toLowerCase()) ||
        (f.reference || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.categorie || '').toLowerCase().includes(search.toLowerCase())
      const matchActive = filterActive === 'all' || (filterActive === 'active' ? f.is_active : !f.is_active)
      return matchSearch && matchActive
    })
  }, [formations, search, filterActive])

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette formation ?')) return
    const result = await deleteFormationAction(id)
    if (result.success) toast('success', 'Formation supprimée')
    else toast('error', result.error || 'Erreur')
    setActiveMenu(null)
  }

  async function handleToggle(id: string, current: boolean) {
    const result = await toggleFormationAction(id, !current)
    if (result.success) toast('success', !current ? 'Formation activée' : 'Formation désactivée')
    setActiveMenu(null)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Catalogue de formations</h1>
          <p className="text-surface-500 mt-1 text-sm">
            {formations.length} formation{formations.length > 1 ? 's' : ''} au catalogue
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
            Nouvelle formation
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-surface-200/60 flex-1 max-w-md">
          <Search className="h-4 w-4 text-surface-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une formation..." className="bg-transparent text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none flex-1" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${filterActive === f ? 'bg-surface-900 text-white shadow-xs' : 'bg-white text-surface-500 border border-surface-200/80 hover:border-surface-300 hover:text-surface-700'}`}>
              {f === 'all' ? 'Toutes' : f === 'active' ? 'Actives' : 'Inactives'}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((f) => (
          <div key={f.id} className={`card p-5 hover:shadow-card transition-shadow ${!f.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                {f.reference && (
                  <div className="text-2xs font-mono text-surface-400 mb-0.5">{f.reference}</div>
                )}
                <h3 className="text-sm font-semibold text-surface-900 line-clamp-2">{f.intitule}</h3>
                {f.sous_titre && <p className="text-xs text-surface-500 mt-0.5 truncate">{f.sous_titre}</p>}
              </div>
              {!readOnly && (
                <div className="relative ml-2">
                  <button onClick={() => setActiveMenu(activeMenu === f.id ? null : f.id)} className="p-1 rounded-lg text-surface-400 hover:bg-surface-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {activeMenu === f.id && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border shadow-elevated py-1 z-20 animate-in-scale origin-top-right">
                      <button onClick={() => { setEditFormation(f); setActiveMenu(null) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-50">
                        <Pencil className="h-4 w-4 text-surface-400" /> Modifier
                      </button>
                      <button onClick={() => handleToggle(f.id, f.is_active)} className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm ${f.is_active ? 'text-warning-600 hover:bg-warning-50' : 'text-success-600 hover:bg-success-50'}`}>
                        {f.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {f.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => handleDelete(f.id)} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-danger-600 hover:bg-danger-50">
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge variant={MODALITE_COLORS[f.modalite]}>{MODALITE_LABELS[f.modalite]}</Badge>
              {f.categorie && <Badge variant="default"><Tag className="h-3 w-3 mr-0.5" />{f.categorie}</Badge>}
              {f.est_certifiante && <Badge variant="success"><Award className="h-3 w-3 mr-0.5" />Certifiante</Badge>}
              {f.is_published && <Badge variant="info"><Eye className="h-3 w-3 mr-0.5" />Publiée</Badge>}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-surface-500 pt-3 border-t border-surface-100">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {f.duree_heures}h
                {f.duree_jours && <span className="text-surface-400">({f.duree_jours}j)</span>}
              </span>
              {f.tarif_inter_ht && (
                <span className="flex items-center gap-1">
                  <Euro className="h-3.5 w-3.5" /> {Number(f.tarif_inter_ht).toLocaleString('fr-FR')} €
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {f.nombre_apprenants_total} apprenants
              </span>
            </div>

            {/* Satisfaction indicators */}
            {(f.taux_satisfaction || f.taux_reussite) && (
              <div className="flex gap-3 mt-2 pt-2 border-t border-surface-100">
                {f.taux_satisfaction && (
                  <div className="text-xs">
                    <span className="text-surface-400">Satisfaction </span>
                    <span className="font-medium text-success-600">{f.taux_satisfaction}%</span>
                  </div>
                )}
                {f.taux_reussite && (
                  <div className="text-xs">
                    <span className="text-surface-400">Réussite </span>
                    <span className="font-medium text-brand-600">{f.taux_reussite}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Version */}
            <div className="text-2xs text-surface-400 mt-2">
              v{f.version} · MAJ {f.date_derniere_maj}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card flex flex-col items-center justify-center text-center py-14 px-8">
          <GraduationCap className="h-6 w-6 text-surface-400" />
          <p className="text-sm text-surface-500">
            {search ? 'Aucune formation trouvée' : 'Aucune formation au catalogue. Créez votre première formation !'}
          </p>
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle formation" size="lg">
        <FormationForm onSuccess={() => { setCreateOpen(false); toast('success', 'Formation créée') }} onCancel={() => setCreateOpen(false)} />
      </Modal>
      <Modal isOpen={!!editFormation} onClose={() => setEditFormation(null)} title="Modifier la formation" size="lg">
        {editFormation && <FormationForm formation={editFormation} onSuccess={() => { setEditFormation(null); toast('success', 'Formation mise à jour') }} onCancel={() => setEditFormation(null)} />}
      </Modal>
    </div>
  )
}
