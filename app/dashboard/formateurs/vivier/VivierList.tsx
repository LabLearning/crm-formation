'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LifeBuoy, Star, MapPin, Phone, Mail, ArrowLeft, ShieldCheck, Presentation } from 'lucide-react'
import { Badge, useToast, BackLink } from '@/components/ui'
import { toggleFormateurSecoursAction } from '../actions'
import type { VivierFormateur } from './page'

interface Props {
  formateurs: VivierFormateur[]
  branchesMeta: { slug: string; label: string }[]
}

export function VivierList({ formateurs, branchesMeta }: Props) {
  const { toast } = useToast()
  const router = useRouter()
  const [branche, setBranche] = useState<string | 'all'>('all')
  const [secoursOnly, setSecoursOnly] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const labelOf = (slug: string) => branchesMeta.find((b) => b.slug === slug)?.label || slug
  const nbSecours = formateurs.filter((f) => f.formateur_secours).length

  const shown = useMemo(() => {
    return formateurs.filter((f) => {
      if (secoursOnly && !f.formateur_secours) return false
      if (branche !== 'all' && !f.branches.includes(branche)) return false
      return true
    })
  }, [formateurs, branche, secoursOnly])

  async function toggle(f: VivierFormateur) {
    setBusy(f.id)
    const r = await toggleFormateurSecoursAction(f.id, !f.formateur_secours)
    if (r.success) { toast('success', !f.formateur_secours ? 'Ajouté au vivier de secours' : 'Retiré du vivier'); router.refresh() }
    else toast('error', r.error || 'Erreur')
    setBusy(null)
  }

  return (
    <div>
      <BackLink fallbackHref="/dashboard/formateurs" label="Formateurs" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-4" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-brand-500" /> Vivier de formateurs de secours
          </h1>
          <p className="text-surface-500 mt-1 text-sm">Plan de continuité en cas de désistement — mobilise vite un formateur qualifié. Preuve pour Qualiopi ind. 18.</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-heading font-bold text-brand-600">{nbSecours}</div>
          <div className="text-xs text-surface-500">dans le vivier</div>
        </div>
      </div>

      <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3 text-xs text-surface-600 mb-5">
        Les <strong>domaines prouvés</strong> sont dérivés des formations réellement animées (historique). Coche « Secours » pour constituer ton vivier ; en cas de plantage, filtre par branche pour trouver un remplaçant expérimenté.
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button onClick={() => setBranche('all')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${branche === 'all' ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>Toutes branches</button>
        {branchesMeta.map((b) => (
          <button key={b.slug} onClick={() => setBranche(b.slug)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${branche === b.slug ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>{b.label}</button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
          <input type="checkbox" checked={secoursOnly} onChange={(e) => setSecoursOnly(e.target.checked)} className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
          Vivier uniquement
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center text-sm text-surface-500">Aucun formateur pour ce filtre.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((f) => (
            <div key={f.id} className={`card p-4 ${f.formateur_secours ? 'ring-1 ring-brand-200' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-heading font-semibold text-surface-900">{f.prenom} {f.nom}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                    <span className="inline-flex items-center gap-1"><Presentation className="h-3.5 w-3.5" />{f.nb_sessions} session{f.nb_sessions > 1 ? 's' : ''}</span>
                    {f.note_moyenne != null && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{Number(f.note_moyenne).toFixed(1)}</span>}
                    {f.zone_intervention && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{f.zone_intervention}</span>}
                  </div>
                </div>
                <button
                  onClick={() => toggle(f)} disabled={busy === f.id}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                    f.formateur_secours ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> {f.formateur_secours ? 'Dans le vivier' : 'Ajouter'}
                </button>
              </div>

              {/* Domaines prouvés */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {f.branches.length > 0
                  ? f.branches.map((b) => <Badge key={b} variant="info">{labelOf(b)}</Badge>)
                  : <span className="text-2xs text-surface-400">Domaine non tracé (formations non taggées par branche)</span>}
              </div>

              {/* Contacts rapides */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-surface-100">
                {f.telephone && <a href={`tel:${f.telephone}`} className="inline-flex items-center gap-1.5 text-xs text-surface-600 hover:text-brand-600"><Phone className="h-3.5 w-3.5" />{f.telephone}</a>}
                {f.whatsapp && <a href={`https://wa.me/${f.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700">WhatsApp</a>}
                {f.email && <a href={`mailto:${f.email}`} className="inline-flex items-center gap-1.5 text-xs text-surface-600 hover:text-brand-600"><Mail className="h-3.5 w-3.5" />{f.email}</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
