import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, GraduationCap, Calendar } from 'lucide-react'
import { Badge, BackLink } from '@/components/ui'
import { POEI_STATUS_LABELS, POEI_STATUS_COLORS } from '@/lib/types/poei'
import { formatDate, companyLabel } from '@/lib/utils'
import { PoeiStatusBar } from './PoeiStatusBar'
import { PoeiEditor } from './PoeiEditor'
import { PoeiCandidats } from './PoeiCandidats'
import { PoeiFacturation } from './PoeiFacturation'
import { PoeiEvaluations } from './PoeiEvaluations'
import { PoeiEmailHistory } from './PoeiEmailHistory'
import { PoeiInterventions } from './PoeiInterventions'
import type { Poei, PoeiCandidat } from '@/lib/types/poei'

export const dynamic = 'force-dynamic'

export default async function PoeiDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: poei } = await supabase
    .from('poei')
    .select(`*, client:clients(raison_sociale, nom_commercial, sigle), formation:formations(intitule), session:sessions(id, reference, date_debut, date_fin, status)`)
    .eq('id', params.id)
    .eq('organization_id', session.organization.id)
    .single()

  if (!poei) redirect('/dashboard/poei')
  const p = poei as Poei

  // Formation « terminée » = statut POEI terminé, session terminée, ou date de fin
  // passée (le statut de session peut être en retard).
  const _sess = (p as any).session
  const formationTerminee = p.statut === 'terminee'
    || _sess?.status === 'terminee'
    || (!!_sess?.date_fin && new Date(_sess.date_fin) < new Date())

  const [{ data: candidatsRaw }, { data: clients }, { data: formations }, { data: apprenants }, { data: emailLogs }] = await Promise.all([
    supabase
      .from('poei_candidats')
      .select('*, apprenant:apprenants(id, nom, prenom, email, telephone, date_naissance)')
      .eq('poei_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('clients').select('id, raison_sociale, nom_commercial, sigle').eq('organization_id', session.organization.id).order('raison_sociale'),
    supabase
      .from('formations').select('id, intitule').eq('organization_id', session.organization.id).eq('is_active', true).order('intitule'),
    // Apprenants de l'établissement du projet (client) — pas tout le monde.
    // Repli sur toute l'org si le projet n'a pas encore de client lié.
    (p.client_id
      ? supabase.from('apprenants').select('id, nom, prenom, email').eq('organization_id', session.organization.id).eq('client_id', p.client_id).order('nom')
      : supabase.from('apprenants').select('id, nom, prenom, email').eq('organization_id', session.organization.id).order('nom').limit(1000)),
    // Tous les emails envoyés pour ce projet (historique + statut attestations)
    supabase
      .from('email_logs')
      .select('id, to_email, to_name, subject, template, status, error, sent_at, created_at')
      .eq('organization_id', session.organization.id)
      .eq('entity_type', 'poei')
      .eq('entity_id', params.id)
      .order('created_at', { ascending: false }),
  ])
  const candidats = (candidatsRaw || []) as PoeiCandidat[]

  // Interventions formateurs (plusieurs formateurs possibles sur un POEI)
  const [{ data: interventions }, { data: formateursList }] = await Promise.all([
    supabase
      .from('poei_interventions')
      .select('*, formateur:formateurs(prenom, nom), contrat:contrats_formateur(id, numero, status, signature_formateur_date)')
      .eq('poei_id', params.id)
      .order('ordre', { ascending: true })
      .order('date_debut', { ascending: true }),
    supabase
      .from('formateurs')
      .select('id, prenom, nom, tarif_journalier, zone_intervention')
      .eq('organization_id', session.organization.id)
      .eq('is_active', true)
      .order('nom'),
  ])

  // Devis POEI existants → map candidat_id → devis (pour le bouton de téléchargement par personne)
  const { data: devisPoei } = await supabase
    .from('devis')
    .select('id, numero, notes_internes')
    .eq('organization_id', session.organization.id)
    .ilike('notes_internes', `%[POEI:${params.id}:%`)
  const devisByCandidat: Record<string, { id: string; numero: string | null }> = {}
  for (const d of devisPoei || []) {
    const m = (d.notes_internes || '').match(new RegExp(`\\[POEI:${params.id}:([^\\]]+)\\]`))
    if (m) devisByCandidat[m[1]] = { id: d.id, numero: d.numero }
  }

  // Factures POEI existantes → map candidat_id → facture (section Facturation)
  const { data: facturesPoei } = await supabase
    .from('factures')
    .select('id, numero, status, montant_ttc, notes_internes')
    .eq('organization_id', session.organization.id)
    .ilike('notes_internes', `%[POEI-FACT:${params.id}:%`)
  const facturesByCandidat: Record<string, { id: string; numero: string | null; status: string; montant_ttc: number | null }> = {}
  for (const f of facturesPoei || []) {
    const m = (f.notes_internes || '').match(new RegExp(`\\[POEI-FACT:${params.id}:([^\\]]+)\\]`))
    if (m) facturesByCandidat[m[1]] = { id: f.id, numero: f.numero, status: f.status, montant_ttc: f.montant_ttc }
  }

  // Agences France Travail (résilient : table absente avant migration 100)
  const { data: agencesFt } = await supabase
    .from('agences_france_travail')
    .select('id, nom, ville')
    .eq('organization_id', session.organization.id).eq('is_active', true).order('nom')

  // Signatures des certificats par les candidats (résilient : migration 109)
  const sigMap: Record<string, { signed_at: string | null; sent_at: string | null }> = {}
  {
    const r = await supabase.from('certificat_signatures')
      .select('apprenant_id, signed_at, sent_at')
      .eq('poei_id', params.id).eq('organization_id', session.organization.id)
    if (!r.error) for (const x of r.data || []) sigMap[String((x as any).apprenant_id)] = { signed_at: (x as any).signed_at, sent_at: (x as any).sent_at }
  }

  // Grilles d'évaluation des candidats (résilient : table absente avant migration 108)
  const { data: grilles } = await supabase
    .from('poei_grilles')
    .select('*')
    .eq('poei_id', params.id).eq('organization_id', session.organization.id)
    .order('semaine', { ascending: true, nullsFirst: false })

  // Dernier statut d'envoi d'attestation par adresse email (le plus récent gagne)
  const emailStatus: Record<string, { status: string; date: string | null }> = {}
  for (const log of (emailLogs || []).filter((l: any) => l.template === 'attestation_entree')) {
    const key = (log.to_email || '').toLowerCase()
    if (key && !emailStatus[key]) emailStatus[key] = { status: log.status, date: log.sent_at || log.created_at }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div>
        <BackLink fallbackHref="/dashboard/poei" label="Retour aux POEI" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 mb-3" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-surface-900 inline-flex items-center gap-2">
              <Building2 className="h-5 w-5 text-sky-500" />
              {p.client_id ? (
                <Link href={`/dashboard/clients/${p.client_id}`} className="hover:text-brand-600 hover:underline transition-colors">
                  {companyLabel(p.client) || 'Projet POEI'}
                </Link>
              ) : (companyLabel(p.client) || 'Projet POEI')}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-surface-500">
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">POEI</span>
              <span className="font-mono">{p.numero}</span>
              <Badge variant={POEI_STATUS_COLORS[p.statut]} dot>{POEI_STATUS_LABELS[p.statut]}</Badge>
              {p.formation?.intitule && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {p.formation.intitule}</span>}
              {p.date_debut && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(p.date_debut, { day: '2-digit', month: 'short' })}{p.date_fin ? ' → ' + formatDate(p.date_fin, { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>}
            </div>
          </div>
        </div>
      </div>

      <PoeiStatusBar poeiId={p.id} statut={p.statut} />

      <PoeiInterventions
        poeiId={p.id}
        interventions={((interventions || []) as any[]).map((iv) => ({
          ...iv,
          contrat: Array.isArray(iv.contrat) ? iv.contrat[0] || null : iv.contrat || null,
        }))}
        formateurs={(formateursList || []) as any[]}
        dureeTotale={p.duree_heures}
      />

      <PoeiCandidats poeiId={p.id} candidats={candidats} apprenants={apprenants || []} emailStatus={emailStatus} clientNom={companyLabel(p.client) || null} clientId={p.client_id} devisByCandidat={devisByCandidat} sessionTerminee={formationTerminee} />

      <PoeiEvaluations
        poeiId={p.id}
        candidats={candidats.map((c: any) => ({ id: c.id, apprenant_id: c.apprenant?.id || c.apprenant_id || null, nom: `${c.apprenant?.prenom || c.prenom || ''} ${c.apprenant?.nom || c.nom || ''}`.trim() || 'Candidat' }))}
        grilles={(grilles || []) as any[]}
      />

      <PoeiFacturation
        poeiId={p.id}
        sessionId={(p as any).session?.id || null}
        sessionTerminee={formationTerminee}
        candidats={candidats as any[]}
        facturesByCandidat={facturesByCandidat}
        agences={(agencesFt || []) as any[]}
        signatures={sigMap}
        currentAgenceId={(p as any).agence_ft_id || null}
        numeroEngagement={(p as any).numero_engagement || null}
      />

      <PoeiEmailHistory logs={(emailLogs || []) as any[]} />

      <PoeiEditor poei={p} clients={clients || []} formations={formations || []} nbCandidats={candidats.length} />
    </div>
  )
}
