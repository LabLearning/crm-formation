import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Mail, Phone, MapPin, Handshake, Users, GraduationCap,
  Banknote, ReceiptEuro, TrendingUp, CheckCircle2,
} from '@/components/ui/icons'
import { Badge, Avatar } from '@/components/ui'
import { BackLink } from '@/components/ui/BackLink'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`

/**
 * Fiche apporteur d'affaires : ses clients apportés, leurs sessions, le CA
 * facturé qu'ils génèrent et la commission qui en découle — le pendant de
 * l'espace franchise, côté apporteurs.
 */
export default async function ApporteurDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const { data: a } = await supabase.from('apporteurs_affaires')
    .select('*').eq('id', params.id).eq('organization_id', orgId).maybeSingle()
  if (!a) redirect('/dashboard/apporteurs')

  const nomAff = a.nom_enseigne || a.raison_sociale || `${a.prenom || ''} ${a.nom || ''}`.trim() || 'Apporteur'

  const [{ data: clients }, { data: leads }, { data: commissions }] = await Promise.all([
    supabase.from('clients')
      .select('id, raison_sociale, nom_commercial, ville, created_at')
      .eq('organization_id', orgId).eq('apporteur_id', params.id)
      .order('created_at', { ascending: false }),
    supabase.from('leads')
      .select('id, entreprise, status, created_at')
      .eq('organization_id', orgId).eq('apporteur_id', params.id)
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('commissions')
      .select('*').eq('apporteur_id', params.id)
      .order('created_at', { ascending: false }).limit(20),
  ])

  const clientIds = (clients || []).map((c) => c.id)

  // Sessions et CA facturé des clients apportés
  let sessions: any[] = []
  let caFacture = 0
  let caPaye = 0
  if (clientIds.length) {
    const [{ data: sess }, { data: factures }] = await Promise.all([
      supabase.from('sessions')
        .select('id, reference, date_debut, status, client_id, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial)')
        .eq('organization_id', orgId).in('client_id', clientIds)
        .order('date_debut', { ascending: false }).limit(30),
      supabase.from('factures')
        .select('montant_ht, status').eq('organization_id', orgId).in('client_id', clientIds)
        .neq('status', 'annulee'),
    ])
    sessions = sess || []
    caFacture = (factures || []).reduce((s2, f: any) => s2 + Number(f.montant_ht || 0), 0)
    caPaye = (factures || []).filter((f: any) => f.status === 'payee').reduce((s2, f: any) => s2 + Number(f.montant_ht || 0), 0)
  }

  // Commission : taux de l'apporteur appliqué au CA facturé (estimation) ;
  // les versements réels vivent dans la table commissions.
  const taux = Number(a.taux_commission) || 0
  const commissionEstimee = taux > 0 ? (caFacture * taux) / 100 : Number(a.commission_fixe || 0) * (clients || []).length
  const commissionsVersees = (commissions || [])
    .filter((c: any) => ['payee', 'versee'].includes(String(c.status || c.statut || '')))
    .reduce((s2, c: any) => s2 + Number(c.montant || c.montant_ht || 0), 0)

  const kpis = [
    { Icon: Building2, label: 'Clients apportés', valeur: String((clients || []).length) },
    { Icon: GraduationCap, label: 'Sessions générées', valeur: String(sessions.length) },
    { Icon: TrendingUp, label: 'CA facturé', valeur: eur(caFacture), sous: caPaye ? `dont ${eur(caPaye)} encaissés` : undefined },
    {
      Icon: ReceiptEuro,
      label: taux > 0 ? `Commission (${taux} %)` : 'Commission',
      valeur: eur(commissionEstimee),
      sous: commissionsVersees ? `${eur(commissionsVersees)} déjà versés` : 'estimation sur CA facturé',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <BackLink fallbackHref="/dashboard/apporteurs" label="Apporteurs" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700" />

      {/* En-tête */}
      <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar firstName={a.prenom || nomAff} lastName={a.nom || ''} size="xl" className="!h-16 !w-16" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-heading font-bold text-surface-900">{nomAff}</h1>
            <Badge variant={a.is_active ? 'success' : 'default'} dot>{a.is_active ? 'Actif' : 'Inactif'}</Badge>
            {a.categorie && <Badge variant="purple">{a.categorie}</Badge>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-surface-500 flex-wrap">
            {a.email && <a href={`mailto:${a.email}`} className="flex items-center gap-1 hover:text-surface-700"><Mail className="h-3.5 w-3.5" />{a.email}</a>}
            {a.telephone && <a href={`tel:${a.telephone}`} className="flex items-center gap-1 hover:text-surface-700"><Phone className="h-3.5 w-3.5" />{a.telephone}</a>}
            {a.ville && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.ville}</span>}
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-surface-400 flex-wrap">
            {taux > 0 && <span className="flex items-center gap-1"><Banknote className="h-3.5 w-3.5" />Commission : {taux} % {a.mode_calcul ? `(${a.mode_calcul})` : ''}</span>}
            {Number(a.commission_fixe) > 0 && <span>Fixe : {eur(Number(a.commission_fixe))} / dossier</span>}
            {a.date_debut_contrat && <span>Contrat depuis le {formatDate(a.date_debut_contrat, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <div className="flex items-center gap-1.5 text-brand-500 mb-2"><k.Icon className="h-4 w-4" /></div>
            <div className="text-xl font-heading font-bold text-surface-900 tabular-nums">{k.valeur}</div>
            <div className="text-xs text-surface-500 mt-0.5">{k.label}</div>
            {k.sous && <div className="text-2xs text-surface-400 mt-0.5">{k.sous}</div>}
          </div>
        ))}
      </div>

      {/* Clients apportés */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
          <Handshake className="h-4 w-4 text-brand-500" />
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Clients apportés ({(clients || []).length})</span>
        </div>
        {(clients || []).length === 0 ? (
          <div className="text-center py-8 text-sm text-surface-400">
            Aucun client rattaché — assignez cet apporteur depuis la fiche d&apos;un client.
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {(clients || []).map((c: any) => (
              <Link key={c.id} href={`/dashboard/clients/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors">
                <Building2 className="h-4 w-4 text-surface-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-900 truncate">{c.nom_commercial || c.raison_sociale}</div>
                  <div className="text-xs text-surface-500">{[c.ville, `apporté le ${formatDate(c.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}`].filter(Boolean).join(' · ')}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sessions générées */}
      {sessions.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-brand-500" />
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Sessions des clients apportés ({sessions.length})</span>
          </div>
          <div className="divide-y divide-surface-100">
            {sessions.slice(0, 12).map((s2: any) => (
              <Link key={s2.id} href={`/dashboard/sessions/${s2.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors">
                {s2.status === 'terminee'
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : <GraduationCap className="h-4 w-4 text-surface-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-900 truncate">{s2.formation?.intitule || s2.reference}</div>
                  <div className="text-xs text-surface-500">
                    {[s2.client?.nom_commercial || s2.client?.raison_sociale, s2.date_debut ? formatDate(s2.date_debut, { day: 'numeric', month: 'short', year: 'numeric' }) : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <Badge variant={s2.status === 'terminee' ? 'purple' : 'default'}>{s2.status === 'terminee' ? 'Terminée' : s2.status}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Leads apportés */}
      {(leads || []).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-500" />
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Leads apportés ({(leads || []).length})</span>
          </div>
          <div className="divide-y divide-surface-100">
            {(leads || []).map((l: any) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                <Users className="h-4 w-4 text-surface-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-surface-900 truncate">{l.entreprise || 'Lead'}</div>
                  <div className="text-xs text-surface-500">{formatDate(l.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <Badge variant="default">{l.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Versements de commissions */}
      {(commissions || []).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
            <ReceiptEuro className="h-4 w-4 text-brand-500" />
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Commissions ({(commissions || []).length})</span>
          </div>
          <div className="divide-y divide-surface-100">
            {(commissions || []).map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <Banknote className="h-4 w-4 text-surface-400 shrink-0" />
                <div className="flex-1 min-w-0 text-sm text-surface-900">{eur(Number(c.montant || c.montant_ht || 0))}</div>
                <span className="text-xs text-surface-400">{formatDate(c.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <Badge variant="default">{String(c.status || c.statut || '—')}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
