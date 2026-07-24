'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Search, Save, Pencil, Trash2, CheckCircle2, Users, Briefcase } from 'lucide-react'
import { Button, Badge, Input, Select, Modal, useToast, RowMenu } from '@/components/ui'
import {
  createCandidatVivierAction, updateCandidatVivierAction, updateCandidatVivierStatutAction,
  assignCandidatToPoeiAction, deleteCandidatVivierAction, validerCandidatVivierAction,
} from './actions'

type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'purple'
const STATUTS: { value: string; label: string; variant: BadgeVariant }[] = [
  { value: 'nouveau', label: 'Nouveau', variant: 'info' },
  { value: 'qualifie', label: 'Qualifié', variant: 'purple' },
  { value: 'presente', label: 'Présenté entreprise', variant: 'warning' },
  { value: 'retenu', label: 'Retenu', variant: 'success' },
  { value: 'valide', label: 'Validé', variant: 'success' },
  { value: 'refuse', label: 'Refusé', variant: 'danger' },
  { value: 'vivier', label: 'En vivier', variant: 'default' },
]
const statutMeta = (s: string) => STATUTS.find((x) => x.value === s) || STATUTS[0]

interface Candidat {
  id: string; civilite: string | null; prenom: string; nom: string; sexe: string | null
  email: string | null; telephone: string | null; date_naissance: string | null
  lieu_naissance: string | null; numero_securite_sociale: string | null
  adresse: string | null; code_postal: string | null; ville: string | null; type_contrat: string | null
  source: string | null; disponibilite: string | null; statut: string; notes: string | null
  client_id: string | null; poei_id: string | null; poste_vise: string | null; identifiant_ft: string | null
  apprenant_id: string | null
  client?: { raison_sociale: string | null } | null
  poei?: { numero: string | null; formation?: { intitule: string | null } | null } | null
}
interface ClientLite { id: string; raison_sociale: string | null }
interface PoeiLite { id: string; numero: string | null; formation?: { intitule: string | null } | null; client?: { raison_sociale: string | null } | null }

export function VivierList({ candidats, clients, poeis }: { candidats: Candidat[]; clients: ClientLite[]; poeis: PoeiLite[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editCand, setEditCand] = useState<Candidat | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const poeiOptions = [
    { value: '', label: 'Aucun projet' },
    ...poeis.map((p) => ({ value: p.id, label: `${p.numero || 'POEI'} — ${p.formation?.intitule || p.client?.raison_sociale || ''}`.trim() })),
  ]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidats.filter((c) => {
      const matchQ = !q ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.client?.raison_sociale || '').toLowerCase().includes(q)
      const matchS = !statutFilter || c.statut === statutFilter
      return matchQ && matchS
    })
  }, [candidats, search, statutFilter])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of candidats) m[c.statut] = (m[c.statut] || 0) + 1
    return m
  }, [candidats])

  async function changeStatut(id: string, statut: string) {
    setBusy(id)
    const r = await updateCandidatVivierStatutAction(id, statut)
    setBusy(null)
    if (r.success) router.refresh()
    else toast('error', r.error || 'Erreur')
  }
  async function changePoei(id: string, poeiId: string) {
    setBusy(id)
    const r = await assignCandidatToPoeiAction(id, poeiId || null)
    setBusy(null)
    if (r.success) { toast('success', 'Rattachement mis à jour'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }
  async function valider(c: Candidat) {
    if (!c.poei_id) { toast('error', 'Rattachez d’abord le candidat à un projet POEI'); return }
    if (!confirm(`Valider ${c.prenom} ${c.nom} ? Cela crée l’apprenant et l’inscrit au projet POEI.`)) return
    setBusy(c.id)
    const r = await validerCandidatVivierAction(c.id)
    setBusy(null)
    if (r.success) { toast('success', 'Candidat validé — apprenant créé et rattaché au projet'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }
  async function remove(c: Candidat) {
    if (!confirm(`Supprimer ${c.prenom} ${c.nom} du vivier ?`)) return
    const r = await deleteCandidatVivierAction(c.id)
    if (r.success) { toast('success', 'Candidat supprimé'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Vivier de candidats</h1>
          <p className="text-surface-500 mt-1 text-sm">{candidats.length} candidat{candidats.length > 1 ? 's' : ''} sourcé{candidats.length > 1 ? 's' : ''} · alimente les projets POEI</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<UserPlus className="h-4 w-4" />}>Nouveau candidat</Button>
      </div>

      {/* Filtres + compteurs par statut */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-surface-200/60 flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 text-surface-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, email, entreprise)…" className="bg-transparent text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none flex-1" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setStatutFilter('')} className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${!statutFilter ? 'bg-surface-900 text-white' : 'bg-white text-surface-500 border border-surface-200/80 hover:text-surface-700'}`}>Tous</button>
          {STATUTS.map((s) => (
            <button key={s.value} onClick={() => setStatutFilter(s.value)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${statutFilter === s.value ? 'bg-surface-900 text-white' : 'bg-white text-surface-500 border border-surface-200/80 hover:text-surface-700'}`}>
              {s.label}{counts[s.value] ? ` · ${counts[s.value]}` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/60 text-left text-2xs font-semibold uppercase tracking-wider text-surface-400">
                <th className="py-2.5 pl-4 pr-3">Candidat</th>
                <th className="py-2.5 px-3">Entreprise</th>
                <th className="py-2.5 px-3">Projet POEI</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const valide = !!c.apprenant_id || c.statut === 'valide'
                return (
                  <tr key={c.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50/60 transition-colors">
                    <td className="py-2.5 pl-4 pr-3">
                      <div className="font-medium text-surface-900">{c.prenom} {c.nom}</div>
                      <div className="text-xs text-surface-500 flex flex-wrap gap-x-3">
                        {c.email && <span className="truncate">{c.email}</span>}
                        {c.telephone && <span>{c.telephone}</span>}
                        {c.source && <span className="text-surface-400">via {c.source}</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-surface-700">{c.client?.raison_sociale || <span className="text-surface-300">—</span>}</td>
                    <td className="py-2.5 px-3">
                      {valide ? (
                        <span className="text-xs text-surface-600">{c.poei?.numero || '—'}</span>
                      ) : (
                        <select value={c.poei_id || ''} disabled={busy === c.id} onChange={(e) => changePoei(c.id, e.target.value)}
                          className="rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-xs text-surface-600 max-w-[220px] focus:outline-none focus:border-surface-300">
                          {poeiOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {valide ? (
                        <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-0.5" />Validé</Badge>
                      ) : (
                        <select value={c.statut} disabled={busy === c.id} onChange={(e) => changeStatut(c.id, e.target.value)}
                          className="rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-xs font-medium text-surface-600 focus:outline-none focus:border-surface-300">
                          {STATUTS.filter((s) => s.value !== 'valide').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <RowMenu items={[
                        { label: 'Modifier', icon: <Pencil className="h-4 w-4 text-surface-400" />, onClick: () => setEditCand(c) },
                        ...(!valide ? [{ label: 'Valider (→ apprenant)', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, onClick: () => valider(c) }] : []),
                        { label: 'Supprimer', icon: <Trash2 className="h-4 w-4" />, onClick: () => remove(c), danger: true },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-14 px-8">
            <Users className="h-6 w-6 text-surface-400 mb-2" />
            <p className="text-sm text-surface-500">{search || statutFilter ? 'Aucun candidat ne correspond.' : 'Aucun candidat dans le vivier. Ajoutez un premier profil sourcé.'}</p>
          </div>
        )}
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau candidat (vivier)" size="lg">
        <CandidatForm clients={clients} poeis={poeis} onDone={() => { setCreateOpen(false); toast('success', 'Candidat ajouté au vivier'); router.refresh() }} />
      </Modal>
      <Modal isOpen={!!editCand} onClose={() => setEditCand(null)} title="Modifier le candidat" size="lg">
        {editCand && <CandidatForm candidat={editCand} clients={clients} poeis={poeis} onDone={() => { setEditCand(null); toast('success', 'Candidat mis à jour'); router.refresh() }} />}
      </Modal>
    </div>
  )
}

function CandidatForm({ candidat, clients, poeis, onDone }: { candidat?: Candidat; clients: ClientLite[]; poeis: PoeiLite[]; onDone: () => void }) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const clientOptions = [{ value: '', label: 'Aucune entreprise' }, ...clients.map((c) => ({ value: c.id, label: c.raison_sociale || c.id }))]
  const poeiOptions = [{ value: '', label: 'Aucun projet' }, ...poeis.map((p) => ({ value: p.id, label: `${p.numero || 'POEI'} — ${p.formation?.intitule || p.client?.raison_sociale || ''}`.trim() }))]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setIsLoading(true); setErrors({})
    const fd = new FormData(e.currentTarget)
    const r = candidat ? await updateCandidatVivierAction(candidat.id, fd) : await createCandidatVivierAction(fd)
    setIsLoading(false)
    if (r.success) onDone()
    else if (r.errors) setErrors(r.errors)
    else toast('error', r.error || 'Erreur')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-3 gap-3">
        <Select id="civilite" name="civilite" label="Civilité" options={[{ value: '', label: '—' }, { value: 'M.', label: 'M.' }, { value: 'Mme', label: 'Mme' }]} defaultValue={candidat?.civilite || ''} />
        <Input id="prenom" name="prenom" label="Prénom *" defaultValue={candidat?.prenom || ''} error={errors.nom?.[0]} />
        <Input id="nom" name="nom" label="Nom *" defaultValue={candidat?.nom || ''} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="email" name="email" type="email" label="Email" defaultValue={candidat?.email || ''} />
        <Input id="telephone" name="telephone" label="Téléphone" defaultValue={candidat?.telephone || ''} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select id="sexe" name="sexe" label="Sexe" options={[{ value: '', label: '—' }, { value: 'H', label: 'Homme' }, { value: 'F', label: 'Femme' }]} defaultValue={candidat?.sexe || ''} />
        <Input id="date_naissance" name="date_naissance" type="date" label="Date de naissance" defaultValue={candidat?.date_naissance || ''} />
        <Input id="lieu_naissance" name="lieu_naissance" label="Lieu de naissance" defaultValue={candidat?.lieu_naissance || ''} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="numero_securite_sociale" name="numero_securite_sociale" label="N° de sécurité sociale" defaultValue={candidat?.numero_securite_sociale || ''} />
        <Input id="type_contrat" name="type_contrat" label="Type de contrat visé" placeholder="CDI, CDD, Alternance…" defaultValue={candidat?.type_contrat || ''} />
      </div>
      <Input id="adresse" name="adresse" label="Adresse" defaultValue={candidat?.adresse || ''} />
      <div className="grid grid-cols-2 gap-3">
        <Input id="code_postal" name="code_postal" label="Code postal" defaultValue={candidat?.code_postal || ''} />
        <Input id="ville" name="ville" label="Ville" defaultValue={candidat?.ville || ''} />
      </div>

      {/* Sourcing */}
      <div className="pt-2 border-t border-surface-100 grid grid-cols-2 gap-3">
        <Input id="source" name="source" label="Source" placeholder="LinkedIn, France Travail, cooptation…" defaultValue={candidat?.source || ''} />
        <Input id="disponibilite" name="disponibilite" label="Disponibilité" placeholder="Immédiate, sous 1 mois…" defaultValue={candidat?.disponibilite || ''} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="poste_vise" name="poste_vise" label="Poste visé" defaultValue={candidat?.poste_vise || ''} />
        <Input id="identifiant_ft" name="identifiant_ft" label="Identifiant France Travail" defaultValue={candidat?.identifiant_ft || ''} />
      </div>

      {/* Rattachements */}
      <div className="grid grid-cols-2 gap-3">
        <Select id="client_id" name="client_id" label="Entreprise pressentie" options={clientOptions} defaultValue={candidat?.client_id || ''} />
        <Select id="poei_id" name="poei_id" label="Projet POEI cible" options={poeiOptions} defaultValue={candidat?.poei_id || ''} />
      </div>
      <Select id="statut" name="statut" label="Statut" options={STATUTS.filter((s) => s.value !== 'valide').map((s) => ({ value: s.value, label: s.label }))} defaultValue={candidat?.statut && candidat.statut !== 'valide' ? candidat.statut : 'nouveau'} />
      <textarea id="notes" name="notes" rows={2} className="input-base resize-none" placeholder="Notes de sourcing…" defaultValue={candidat?.notes || ''} />

      <div className="flex justify-end gap-3 pt-3 border-t border-surface-100">
        <Button type="button" variant="secondary" onClick={onDone}>Annuler</Button>
        <Button type="submit" isLoading={isLoading} icon={<Save className="h-4 w-4" />}>{candidat ? 'Mettre à jour' : 'Ajouter au vivier'}</Button>
      </div>
    </form>
  )
}
