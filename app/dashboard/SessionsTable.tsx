import Link from 'next/link'
import { Badge } from '@/components/ui'
import { Users, ArrowRight } from '@/components/ui/icons'
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/lib/types/formation'
import { formatDate } from '@/lib/utils'

/**
 * Tableau de sessions du tableau de bord : formation, client, dates,
 * formateur, inscrits, statut — chaque ligne ouvre la session.
 * Rendu serveur (lignes = liens), style design system.
 */
export interface SessionTableRow {
  id: string
  intitule?: string | null
  formation?: { intitule?: string | null } | null
  client?: { raison_sociale?: string | null } | null
  formateur?: { prenom?: string | null; nom?: string | null } | null
  date_debut: string
  date_fin: string
  status: string
  _inscrits?: number
}

const GRILLE = 'minmax(0,2.2fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.2fr) 70px 110px'

export function SessionsTable({ titre, sessions, badge, vide, lienTous }: {
  titre: string
  sessions: SessionTableRow[]
  badge?: React.ReactNode
  vide: string
  lienTous?: string
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {badge}
          <span className="text-xs font-semibold text-surface-600 uppercase tracking-wider">{titre}</span>
          <span className="text-xs text-surface-400">{sessions.length}</span>
        </div>
        {lienTous && (
          <Link href={lienTous} className="text-xs text-brand-500 font-medium flex items-center gap-1 hover:text-brand-600">
            Tout voir <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-xs text-surface-400">{vide}</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {/* En-tête */}
            <div className="grid gap-3 px-4 py-2 bg-surface-50 border-b border-surface-100 text-[10px] font-semibold text-surface-400 uppercase tracking-wider"
              style={{ gridTemplateColumns: GRILLE }}>
              <span>Formation</span>
              <span>Client</span>
              <span>Dates</span>
              <span>Formateur</span>
              <span className="text-center">Inscrits</span>
              <span>Statut</span>
            </div>
            <div className="divide-y divide-surface-100">
              {sessions.map((s) => (
                <Link key={s.id} href={`/dashboard/sessions/${s.id}`}
                  className="grid gap-3 px-4 py-2.5 items-center hover:bg-surface-50 transition-colors"
                  style={{ gridTemplateColumns: GRILLE }}>
                  <span className="text-sm font-medium text-surface-900 truncate">
                    {s.intitule || s.formation?.intitule || 'Session'}
                  </span>
                  <span className="text-xs text-surface-500 truncate">{s.client?.raison_sociale || '—'}</span>
                  <span className="text-xs text-surface-500 whitespace-nowrap">
                    {formatDate(s.date_debut, { day: 'numeric', month: 'short' })}
                    {s.date_fin !== s.date_debut ? ` → ${formatDate(s.date_fin, { day: 'numeric', month: 'short' })}` : ''}
                  </span>
                  <span className="text-xs text-surface-500 truncate">
                    {s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : <span className="text-surface-300">à affecter</span>}
                  </span>
                  <span className="flex justify-center">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${(s._inscrits || 0) > 0 ? 'bg-brand-50 text-brand-600' : 'bg-surface-100 text-surface-400'}`}>
                      <Users className="h-3 w-3" /> {s._inscrits || 0}
                    </span>
                  </span>
                  <span>
                    <Badge variant={(SESSION_STATUS_COLORS as any)[s.status] || 'default'} dot>
                      {(SESSION_STATUS_LABELS as any)[s.status] || s.status}
                    </Badge>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
