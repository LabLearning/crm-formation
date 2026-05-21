import { getFranchiseSession } from '@/lib/franchise-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ClipboardCheck, Star, FileText, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TYPE_META: Record<string, { label: string; bg: string; text: string }> = {
  hygiene: { label: 'Hygiène', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  conformite: { label: 'Conformité', bg: 'bg-blue-50', text: 'text-blue-700' },
  qualite: { label: 'Qualité', bg: 'bg-violet-50', text: 'text-violet-700' },
  autre: { label: 'Autre', bg: 'bg-surface-100', text: 'text-surface-600' },
}

function noteColor(note: number | null, sur: number) {
  if (note == null) return 'text-surface-400'
  const pct = (note / sur) * 100
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

export default async function FranchiseAuditsPage() {
  const { franchise, organization } = await getFranchiseSession()
  const supabase = await createServiceRoleClient()

  const { data: audits } = await supabase
    .from('audits_etablissement')
    .select('id, date_audit, type_audit, note_globale, note_sur, points_forts, points_amelioration, bilan, fichier_url, client:clients(raison_sociale)')
    .eq('franchise_id', franchise.id)
    .eq('organization_id', organization.id)
    .order('date_audit', { ascending: false })

  const list = audits || []
  const withNote = list.filter((a) => a.note_globale != null)
  const avg = withNote.length ? withNote.reduce((s, a) => s + (Number(a.note_globale) / a.note_sur) * 20, 0) / withNote.length : null

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Audits</h1>
          <p className="text-surface-500 text-sm mt-1">Audits hygiène & conformité réalisés dans vos établissements.</p>
        </div>
        {avg != null && (
          <div className="card px-4 py-2 inline-flex items-center gap-2">
            <Star className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-lg font-heading font-bold text-surface-900 leading-none">{avg.toFixed(1)}/20</div>
              <div className="text-[10px] text-surface-400">moyenne réseau</div>
            </div>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center justify-center text-center py-14 px-8">
          <ClipboardCheck className="h-6 w-6 text-surface-400 mb-3" />
          <p className="text-sm text-surface-500">Aucun audit pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const meta = TYPE_META[a.type_audit] || TYPE_META.autre
            return (
              <div key={a.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-surface-50 flex flex-col items-center justify-center">
                    <span className={`text-base font-heading font-bold leading-none ${noteColor(a.note_globale, a.note_sur)}`}>
                      {a.note_globale != null ? a.note_globale : '—'}
                    </span>
                    <span className="text-[9px] text-surface-400 mt-0.5">/{a.note_sur}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      <span className="text-sm font-medium text-surface-900 inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-surface-400" />
                        {(a.client as any)?.raison_sociale || 'Établissement'}
                      </span>
                    </div>
                    <div className="text-xs text-surface-500 mt-0.5">
                      {new Date(a.date_audit).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  {a.fichier_url && (
                    <a href={a.fichier_url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100">
                      <FileText className="h-3.5 w-3.5" /> Rapport
                    </a>
                  )}
                </div>

                {(a.points_forts || a.points_amelioration || a.bilan) && (
                  <div className="mt-3 pt-3 border-t border-surface-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {a.points_forts && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">Points forts</div>
                        <p className="text-surface-700 whitespace-pre-wrap">{a.points_forts}</p>
                      </div>
                    )}
                    {a.points_amelioration && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 mb-1">À améliorer</div>
                        <p className="text-surface-700 whitespace-pre-wrap">{a.points_amelioration}</p>
                      </div>
                    )}
                    {a.bilan && (
                      <div className="sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-1">Bilan</div>
                        <p className="text-surface-700 whitespace-pre-wrap">{a.bilan}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
