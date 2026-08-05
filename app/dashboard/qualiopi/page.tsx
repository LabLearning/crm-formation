import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { QualiopiDashboard } from './QualiopiDashboard'
import type { QualiopiIndicateur } from '@/lib/types/qualiopi'

export interface CrmEvidence { label: string; href: string; count: number; warn?: boolean }

export default async function QualiopiPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const { data: indicateurs } = await supabase
    .from('qualiopi_indicateurs')
    .select('*, preuves:qualiopi_preuves(*)')
    .eq('organization_id', orgId)
    .order('critere', { ascending: true })
    .order('indicateur', { ascending: true })

  // Signer les preuves stockées (bucket privé) en un seul appel batch (createSignedUrls)
  const preuvesToSign: { p: any; path: string }[] = []
  for (const ind of indicateurs || []) {
    for (const p of (ind as any).preuves || []) {
      if (!p.document_url) continue
      if (/^https?:\/\//.test(p.document_url)) {
        p.signed_url = p.document_url
      } else {
        preuvesToSign.push({ p, path: p.document_url })
      }
    }
  }
  if (preuvesToSign.length > 0) {
    const { data: signedList } = await supabase.storage
      .from('dossiers')
      .createSignedUrls(preuvesToSign.map((x) => x.path), 3600)
    ;(signedList || []).forEach((signed, idx) => {
      preuvesToSign[idx].p.signed_url = signed?.error ? null : signed?.signedUrl || null
    })
  }

  // Preuves vivantes réelles produites par le CRM.
  // On distingue les VRAIS compteurs de preuve (émargements signés, QCM complétés,
  // conventions…) des volumes bruts trompeurs — un auditeur repère le gonflage.
  const cnt = async (table: string, apply?: (q: any) => any): Promise<number> => {
    try {
      let q = supabase.from(table).select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
      if (apply) q = apply(q)
      const { count } = await q
      return count || 0
    } catch { return 0 }
  }
  const [
    nbSessionsTerm, nbEmargSignes, nbQcmComplets, nbConventions, nbContratsForm,
    nbFormateurs, nbFormations, nbDocs, nbRecla, nbActions, nbApprenants, orgRow,
  ] = await Promise.all([
    cnt('sessions', (q) => q.eq('status', 'terminee')),
    cnt('emargements', (q) => q.not('signed_at', 'is', null)),
    cnt('qcm_reponses', (q) => q.eq('is_complete', true)),
    cnt('conventions'),
    cnt('contrats_formateur'),
    cnt('formateurs'),
    cnt('formations'),
    cnt('documents'),
    cnt('reclamations'),
    cnt('actions_amelioration'),
    cnt('apprenants'),
    supabase.from('organizations').select('referent_handicap_nom, numero_da, delai_acces').eq('id', orgId).single().then((r) => r.data as any).catch(() => null),
  ])
  const hasReferentHandicap = !!(orgRow?.referent_handicap_nom)
  const hasNda = !!(orgRow?.numero_da)

  // Mapping indicateur → preuves réelles du CRM (compteurs honnêtes).
  // warn:true = trou à combler avant l'audit.
  const crmEvidence: Record<number, CrmEvidence[]> = {
    1: [{ label: 'Site & catalogue publics', href: '/site/formations', count: nbFormations }],
    2: [{ label: 'Indicateurs de résultats — à publier', href: '/dashboard/reporting', count: 0, warn: true }],
    4: [{ label: 'Conventions / devis (recueil du besoin)', href: '/dashboard/conventions', count: nbConventions }],
    5: [{ label: 'Programmes avec objectifs', href: '/dashboard/formations', count: nbFormations }],
    6: [{ label: 'Programmes détaillés', href: '/dashboard/formations', count: nbFormations }],
    8: [{ label: 'Positionnement / QCM complétés', href: '/dashboard/qcm', count: nbQcmComplets, warn: nbQcmComplets < 30 }],
    9: [{ label: 'Sessions réalisées (convocations, déroulé)', href: '/dashboard/sessions', count: nbSessionsTerm }],
    11: [{ label: 'Évaluations des acquis (QCM complétés)', href: '/dashboard/evaluations', count: nbQcmComplets, warn: nbQcmComplets < 30 }],
    12: [{ label: 'Émargements signés', href: '/dashboard/emargement', count: nbEmargSignes, warn: true }],
    16: [{ label: hasReferentHandicap ? 'Référent handicap renseigné' : 'Référent handicap à renseigner', href: '/dashboard/settings', count: hasReferentHandicap ? 1 : 0, warn: !hasReferentHandicap }],
    17: [{ label: 'Formateurs & moyens', href: '/dashboard/formateurs', count: nbFormateurs }],
    18: [{ label: 'Contrats formateur', href: '/dashboard/formateurs', count: nbContratsForm }],
    21: [{ label: 'Formateurs (CV, diplômes)', href: '/dashboard/formateurs', count: nbFormateurs }],
    23: [{ label: 'Veille légale — à constituer', href: '/dashboard/qualiopi', count: 0, warn: true }],
    24: [{ label: 'Veille métier — à constituer', href: '/dashboard/qualiopi', count: 0, warn: true }],
    25: [{ label: 'Veille pédagogique — à constituer', href: '/dashboard/qualiopi', count: 0, warn: true }],
    27: [{ label: hasNda ? 'N° DA / Qualiopi / RGPD' : 'N° déclaration d\'activité à renseigner', href: '/dashboard/settings', count: hasNda ? 1 : 0, warn: !hasNda }],
    28: [{ label: 'Satisfaction (papier — à saisir dans le CRM)', href: '/dashboard/evaluations', count: 0, warn: true }],
    29: [{ label: 'Registre des réclamations', href: '/dashboard/reclamations', count: nbRecla, warn: nbRecla === 0 }],
    30: [{ label: "Actions d'amélioration", href: '/dashboard/reclamations', count: nbActions, warn: nbActions === 0 }],
    31: [{ label: 'Analyse des causes / bilans', href: '/dashboard/reclamations', count: nbActions, warn: nbActions === 0 }],
    32: [{ label: "Plan d'amélioration continue", href: '/dashboard/reclamations', count: nbActions, warn: nbActions === 0 }],
  }

  return (
    <div className="animate-fade-in">
      <QualiopiDashboard
        indicateurs={(indicateurs || []) as QualiopiIndicateur[]}
        initialized={(indicateurs || []).length > 0}
        crmEvidence={crmEvidence}
      />
    </div>
  )
}
