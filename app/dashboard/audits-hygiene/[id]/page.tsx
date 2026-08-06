import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Minus, ExternalLink,
  Calendar, User, Building2, ListChecks,
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui'
import { BackLink } from '@/components/ui/BackLink'
import { formatDate } from '@/lib/utils'
import { SECTIONS, pointDe, CHECKLIST_LABELS, VALEURS } from '@/lib/audithygiene-referentiel'

export const dynamic = 'force-dynamic'

const OUTIL_URL = 'https://audithygiene.vercel.app'

const MENTION_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  SATISFAISANT: 'success',
  'A AMELIORER': 'warning',
  INSUFFISANT: 'danger',
}

const ICONE: Record<string, React.ReactNode> = {
  ok: <CheckCircle2 className="h-4 w-4 text-success-500" />,
  warn: <AlertTriangle className="h-4 w-4 text-warning-500" />,
  ko: <XCircle className="h-4 w-4 text-danger-500" />,
  na: <Minus className="h-4 w-4 text-surface-300" />,
}

export default async function AuditHygieneDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: audit } = await supabase
    .from('ah_audits')
    .select('*, etablissement:ah_etablissements(id, nom, ville, code_postal, adresse, siret, client_id, franchise_id)')
    .eq('id', params.id)
    .eq('organization_id', session.organization.id)
    .maybeSingle()

  if (!audit) notFound()

  const etab: any = audit.etablissement
  const client = etab?.client_id
    ? (await supabase.from('clients').select('id, raison_sociale, nom_commercial').eq('id', etab.client_id).maybeSingle()).data
    : null

  const answers: Record<string, { val?: string; note?: string }> = audit.answers || {}
  const checklist: Record<string, boolean> = audit.checklist || {}

  // Non-conformités d'abord : c'est ce qui déclenche une action et un besoin de formation.
  const nonConformes = Object.entries(answers)
    .filter(([, a]) => a?.val === 'ko')
    .map(([cle, a]) => ({ cle, ...(pointDe(cle) || {}), note: a.note }))
    .sort((a, b) => Number(!!b.critical) - Number(!!a.critical))

  const repondues = Object.values(answers).filter((a) => a?.val && a.val !== '').length
  const scoreCouleur = (n: number) => (n >= 80 ? '#16a34a' : n >= 60 ? '#d97706' : '#dc2626')
  const sc = Number(audit.score_global) || 0

  return (
    <div className="animate-fade-in max-w-4xl">
      <BackLink fallbackHref="/dashboard/audits-hygiene" />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mt-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading truncate">
            {etab?.nom || 'Établissement inconnu'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-surface-500">
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{audit.date_audit ? formatDate(audit.date_audit) : '—'}</span>
            {audit.formateur_nom && <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{audit.formateur_nom}</span>}
            {etab?.ville && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{etab.ville}</span>}
            {audit.num_rapport && <span className="font-mono text-xs">{audit.num_rapport}</span>}
          </div>
          {client && (
            <Link href={`/dashboard/clients/${client.id}`} className="inline-block mt-2 text-sm text-brand-600 hover:underline">
              {client.raison_sociale || client.nom_commercial}
            </Link>
          )}
        </div>
        <a href={`${OUTIL_URL}/hygiene/audit/${audit.source_id}`} target="_blank" rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2 shrink-0 text-sm">
          <ExternalLink className="h-4 w-4" /> Rapport complet
        </a>
      </div>

      {/* Synthèse */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="text-center shrink-0">
            <div className="text-5xl font-heading font-bold tracking-display" style={{ color: scoreCouleur(sc) }}>{sc}</div>
            <div className="text-xs text-surface-400">/ 100</div>
            {audit.mention && (
              <div className="mt-2"><Badge variant={MENTION_VARIANT[audit.mention] || 'default'}>{audit.mention}</Badge></div>
            )}
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Conformes', valeur: audit.nb_conformes ?? 0, couleur: 'text-success-600', fond: 'bg-success-50/60' },
              { label: 'À améliorer', valeur: audit.nb_partiels ?? 0, couleur: 'text-warning-600', fond: 'bg-warning-50/60' },
              { label: 'Non conformes', valeur: audit.nb_non_conformes ?? 0, couleur: 'text-danger-600', fond: 'bg-danger-50/60' },
              { label: 'Points évalués', valeur: repondues, couleur: 'text-surface-600', fond: 'bg-surface-100' },
            ].map((s) => (
              <div key={s.label} className={`text-center p-3 rounded-xl ${s.fond}`}>
                <div className={`text-xl font-heading font-bold ${s.couleur}`}>{s.valeur}</div>
                <div className="text-[11px] text-surface-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 text-xs text-surface-400">
          {audit.type_audit || 'Audit hygiène'}
          {audit.statut ? ` · ${audit.statut}` : ''}
          {audit.email_envoye_at ? ` · rapport envoyé le ${formatDate(audit.email_envoye_at)}` : ''}
        </div>
      </div>

      {/* Non-conformités */}
      {nonConformes.length > 0 && (
        <div className="card p-5 mb-6 border-danger-200">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-4 w-4 text-danger-600" />
            <h2 className="text-sm font-heading font-semibold text-surface-900">
              Non-conformités relevées ({nonConformes.length})
            </h2>
          </div>
          <div className="space-y-2">
            {nonConformes.map((nc) => (
              <div key={nc.cle} className="flex items-start gap-3 p-3 rounded-xl bg-danger-50/40">
                <XCircle className="h-4 w-4 text-danger-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-surface-800">
                    {nc.label || <span className="font-mono text-xs">{nc.cle}</span>}
                    {nc.critical && <Badge variant="danger" className="ml-2">Point critique</Badge>}
                  </div>
                  <div className="text-xs text-surface-500 mt-0.5">
                    {nc.section || 'Section inconnue'}{nc.ref ? ` · ${nc.ref}` : ''}
                  </div>
                  {nc.note && <div className="text-xs text-surface-600 mt-1 italic">{nc.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observations du formateur */}
      {[
        { titre: 'Bilan', texte: audit.obs_bilan },
        { titre: 'Actions correctives', texte: audit.obs_actions },
        { titre: 'Recommandations', texte: audit.obs_reco },
        { titre: 'Prochaine étape', texte: audit.obs_next },
        { titre: 'Délai', texte: audit.obs_delai },
      ].some((o) => o.texte) && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-heading font-semibold text-surface-900 mb-3">Observations du formateur</h2>
          <div className="space-y-3">
            {[
              { titre: 'Bilan', texte: audit.obs_bilan },
              { titre: 'Actions correctives', texte: audit.obs_actions },
              { titre: 'Recommandations', texte: audit.obs_reco },
              { titre: 'Prochaine étape', texte: audit.obs_next },
              { titre: 'Délai', texte: audit.obs_delai },
            ].filter((o) => o.texte).map((o) => (
              <div key={o.titre}>
                <div className="section-label mb-1">{o.titre}</div>
                <p className="text-sm text-surface-700 whitespace-pre-line">{o.texte}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grille complète */}
      {repondues > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-sm font-heading font-semibold text-surface-900">Grille d&apos;audit</h2>
          {SECTIONS.map((sec) => {
            // Une réponse rejoint sa section même si sa clé vient d'une version
            // antérieure de la grille (résolution par pointDe).
            const points = Object.entries(answers)
              .map(([cle, reponse]) => ({ cle, reponse, point: pointDe(cle) }))
              .filter((x) => x.reponse?.val && x.point?.section === sec.title)
              .map((x) => ({ ...x.point!, cle: x.cle, reponse: x.reponse }))
            if (points.length === 0) return null
            return (
              <div key={sec.id} className="card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-surface-100 bg-surface-50/60">
                  <span className="text-xs font-semibold text-surface-600 uppercase tracking-wider">{sec.title}</span>
                </div>
                <div className="divide-y divide-surface-100">
                  {points.map((p) => (
                    <div key={p.cle} className="px-4 py-2.5 flex items-start gap-3">
                      <span className="mt-0.5 shrink-0">{ICONE[p.reponse!.val as string] || ICONE.na}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-surface-800">{p.label}</div>
                        {p.reponse!.note && <div className="text-xs text-surface-500 mt-0.5 italic">{p.reponse!.note}</div>}
                      </div>
                      <span className="text-xs shrink-0" style={{ color: VALEURS[p.reponse!.val as string]?.couleur }}>
                        {VALEURS[p.reponse!.val as string]?.label || p.reponse!.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Réponses issues d'une version antérieure de la grille : on les
              affiche telles quelles plutôt que de les perdre silencieusement. */}
          {(() => {
            const inconnus = Object.entries(answers).filter(([k, a]) => a?.val && !pointDe(k))
            if (inconnus.length === 0) return null
            return (
              <div className="card overflow-hidden border-warning-200">
                <div className="px-4 py-2.5 border-b border-warning-200 bg-warning-50/60 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning-600" />
                  <span className="text-xs font-semibold text-surface-700 uppercase tracking-wider">
                    Points d&apos;une version antérieure de la grille ({inconnus.length})
                  </span>
                </div>
                <div className="px-4 py-2 text-xs text-surface-500 border-b border-surface-100">
                  Ces points ont été évalués lors de l&apos;audit mais ne figurent plus dans la grille actuelle de
                  l&apos;outil. Leur libellé n&apos;est plus disponible ; la réponse est conservée telle quelle.
                </div>
                <div className="divide-y divide-surface-100">
                  {inconnus.map(([cle, a]) => (
                    <div key={cle} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="shrink-0">{ICONE[a.val as string] || ICONE.na}</span>
                      <span className="font-mono text-xs text-surface-600 flex-1">{cle}</span>
                      <span className="text-xs" style={{ color: VALEURS[a.val as string]?.couleur }}>
                        {VALEURS[a.val as string]?.label || a.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Checklist documentaire */}
      {Object.keys(checklist).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-surface-100 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-brand-500" />
            <span className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Checklist documentaire</span>
          </div>
          <div className="divide-y divide-surface-100">
            {Object.entries(checklist).map(([cle, coche]) => (
              <div key={cle} className="px-4 py-2.5 flex items-center gap-3">
                {coche
                  ? <CheckCircle2 className="h-4 w-4 text-success-500 shrink-0" />
                  : <Minus className="h-4 w-4 text-surface-300 shrink-0" />}
                <span className="text-sm text-surface-800 flex-1">
                  {CHECKLIST_LABELS[cle] || <span className="font-mono text-xs">{cle}</span>}
                </span>
                <span className={`text-xs ${coche ? 'text-success-600' : 'text-surface-400'}`}>
                  {coche ? 'Fourni' : 'Manquant'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
