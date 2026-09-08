import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveDocumentLogoUrl } from '@/lib/pdf/org-logo'
import { notFound } from 'next/navigation'
import { EvaluationFormateurForm } from './EvaluationFormateurForm'
import { QUESTIONS_FORMATEUR } from '@/lib/evaluation-formateur-referent'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Évaluation du formateur — Lab Learning' }

/**
 * Questionnaire public du référent de l'établissement sur un formateur.
 * Le jeton reçu par email fait office d'accès, sans compte.
 */
export default async function EvaluationFormateurPage({ params }: { params: { token: string } }) {
  const supabase = await createServiceRoleClient()
  if (!/^[0-9a-f-]{36}$/i.test(params.token)) notFound()

  const { data: demande } = await supabase
    .from('appreciations_parties_prenantes')
    .select('id, statut, repondant_nom, repondant_fonction, repondant_email, formateur:formateur_id(prenom, nom), client:client_id(raison_sociale, nom_commercial), poei:poei_id(numero, date_debut, date_fin, formation:formation_id(intitule)), session:session_id(reference, date_debut, date_fin, intitule, formation:formation_id(intitule)), organization:organization_id(id, name, logo_url)')
    .eq('token', params.token).eq('type', 'evaluation_formateur').maybeSingle()
  if (!demande) notFound()

  const d: any = demande
  const formateurNom = [d.formateur?.prenom, d.formateur?.nom].filter(Boolean).join(' ') || 'le formateur'
  const etablissement = d.client?.nom_commercial || d.client?.raison_sociale || ''
  const source = d.poei || d.session
  const formation = source?.formation?.intitule || source?.intitule || ''
  const fr = (x?: string | null) => (x ? new Date(x).toLocaleDateString('fr-FR') : '')
  const periode = source?.date_debut ? `du ${fr(source.date_debut)} au ${fr(source.date_fin || source.date_debut)}` : ''
  const logo = await resolveDocumentLogoUrl(supabase, d.organization)

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-xl mx-auto px-5 py-12">
        <div className="text-center mb-8">
          {logo && <img src={logo} alt={d.organization?.name || 'Lab Learning'} className="h-11 mx-auto mb-4 object-contain" />}
          <h1 className="text-2xl font-heading font-bold text-surface-900">Votre avis sur {formateurNom}</h1>
          <p className="text-sm text-surface-500 mt-2">
            {[formation, etablissement, periode].filter(Boolean).join(' · ')}
          </p>
        </div>
        <EvaluationFormateurForm
          token={params.token}
          formateurNom={formateurNom}
          dejaRepondu={d.statut === 'repondu'}
          questions={QUESTIONS_FORMATEUR}
          repondant={{ nom: d.repondant_nom || '', fonction: d.repondant_fonction || '', email: d.repondant_email || '' }}
        />
      </div>
    </div>
  )
}
