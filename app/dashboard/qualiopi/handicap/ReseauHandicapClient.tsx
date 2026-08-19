'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Accessibility, GraduationCap, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { BackLink, useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { enregistrerContactHandicapAction, supprimerContactHandicapAction } from './actions'

const ORGANISMES = ['RHF Agefiph', 'Cap emploi', 'MDPH', 'Agefiph (national)', 'Autre']
const REGIONS = ['Occitanie', 'Île-de-France', 'Auvergne-Rhône-Alpes', 'PACA', 'Grand Est', 'Hauts-de-France', 'Nouvelle-Aquitaine', 'Bretagne', 'Pays de la Loire', 'Normandie', 'Centre-Val de Loire', 'Bourgogne-Franche-Comté', 'National']

/** Le carnet du référent handicap : qui appeler, dans quelle région, vérifié
 *  quand. La date de vérification se met à jour à chaque enregistrement. */
export function ReseauHandicapClient({ contacts, tableAbsente, referent }: {
  contacts: any[]
  tableAbsente: boolean
  referent: { referent_handicap_nom?: string | null; referent_handicap_email?: string | null; referent_handicap_telephone?: string | null } | null
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [edition, setEdition] = useState<any | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnCours(true)
    const r = await enregistrerContactHandicapAction(new FormData(e.currentTarget))
    setEnCours(false)
    if (r.success) { toast('success', 'Contact enregistré et daté'); setEdition(null); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer ce contact ?')) return
    const r = await supprimerContactHandicapAction(id)
    if (r.success) { toast('success', 'Contact supprimé'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div>
        <BackLink fallbackHref="/dashboard/qualiopi" label="Qualiopi" />
        <h1 className="text-xl font-heading font-bold text-surface-900 flex items-center gap-2 mt-1">
          <Accessibility className="h-5 w-5 text-brand-500" /> Réseau handicap
        </h1>
        <p className="text-sm text-surface-500 mt-1">
          Les contacts mobilisables par région (indicateur 26) — chaque ligne porte sa date de dernière vérification.
          Référent handicap : <strong className="text-surface-700">{referent?.referent_handicap_nom || 'Sofiane EL OUAHID'}</strong>
          {referent?.referent_handicap_telephone ? ` · ${referent.referent_handicap_telephone}` : ''}
        </p>
      </div>

      {tableAbsente && (
        <div className="card p-4 border-amber-200 bg-amber-50/40 text-sm text-amber-800">
          La table du réseau n&apos;existe pas encore : appliquer la migration <strong>136_reseau_handicap.sql</strong> dans Supabase.
        </div>
      )}

      {/* Le webinaire RHF : la formation du référent, avec attestation à verser. */}
      <div className="card p-4 flex items-start gap-3">
        <GraduationCap className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
        <div className="text-sm text-surface-700 leading-relaxed">
          <strong>Former le référent :</strong> l&apos;Agefiph et les RHF régionales proposent des webinaires
          « référent handicap en organisme de formation » qui délivrent une <strong>attestation de participation</strong> —
          à verser au dossier du référent (fiche formateur ou documents). Inscription via la RHF de votre région
          ou <span className="whitespace-nowrap">agefiph.fr → Ressource Handicap Formation</span>.
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Contacts par région</span>
          <button onClick={() => setEdition({})} className="btn-primary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs">
            <Plus className="h-3.5 w-3.5" /> Ajouter un contact
          </button>
        </div>
        {contacts.length === 0 ? (
          <div className="p-8 text-center text-sm text-surface-400">
            Aucun contact — commencez par la RHF de votre région (rhf-occitanie@agefiph.fr) et l&apos;Agefiph nationale (0 800 11 10 09).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50/60 text-left">
                  {['Région', 'Organisme', 'Contact', 'Téléphone', 'Email', 'Vérifié le', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-surface-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 text-surface-900 whitespace-nowrap">{c.region}</td>
                    <td className="px-4 py-2.5 text-surface-700 whitespace-nowrap">{c.organisme}</td>
                    <td className="px-4 py-2.5 text-surface-700">{[c.prenom, c.nom].filter(Boolean).join(' ') || <span className="text-surface-300">à compléter</span>}</td>
                    <td className="px-4 py-2.5 text-surface-700 whitespace-nowrap">{c.telephone || '—'}</td>
                    <td className="px-4 py-2.5 text-surface-700">{c.email || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-surface-500 whitespace-nowrap">
                      {c.verifie_le ? formatDate(c.verifie_le, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button onClick={() => setEdition(c)} className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => supprimer(c.id)} className="p-1.5 rounded-lg text-surface-400 hover:bg-danger-50 hover:text-danger-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edition !== null && (
        <form onSubmit={soumettre} className="card p-5 space-y-3">
          <div className="text-sm font-semibold text-surface-900">{edition.id ? 'Modifier le contact' : 'Nouveau contact'}</div>
          {edition.id && <input type="hidden" name="id" value={edition.id} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-surface-500">Région
              <select name="region" defaultValue={edition.region || 'Occitanie'} className="input-base mt-1">
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="text-xs text-surface-500">Organisme
              <select name="organisme" defaultValue={edition.organisme || 'RHF Agefiph'} className="input-base mt-1">
                {ORGANISMES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label className="text-xs text-surface-500">Prénom
              <input name="prenom" defaultValue={edition.prenom || ''} className="input-base mt-1" />
            </label>
            <label className="text-xs text-surface-500">Nom
              <input name="nom" defaultValue={edition.nom || ''} className="input-base mt-1" />
            </label>
            <label className="text-xs text-surface-500">Téléphone
              <input name="telephone" defaultValue={edition.telephone || ''} className="input-base mt-1" />
            </label>
            <label className="text-xs text-surface-500">Email
              <input name="email" type="email" defaultValue={edition.email || ''} className="input-base mt-1" />
            </label>
          </div>
          <label className="block text-xs text-surface-500">Notes
            <input name="notes" defaultValue={edition.notes || ''} placeholder="Périmètre, horaires, dernier échange…" className="input-base mt-1" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEdition(null)} className="btn-secondary !py-1.5 !px-3 text-sm">Annuler</button>
            <button type="submit" disabled={enCours} className="btn-primary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm disabled:opacity-60">
              {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer (daté du jour)
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
