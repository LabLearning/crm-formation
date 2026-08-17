import { createServiceRoleClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AppreciationForm } from './AppreciationForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Votre appréciation — Lab Learning' }

/**
 * Formulaire public d'appréciation (indicateur 30) : l'entreprise cliente
 * après une session, le financeur pour la sollicitation annuelle. Sans compte
 * — le lien reçu par email fait office d'accès.
 */
export default async function AppreciationPage({ params }: { params: { cible: string } }) {
  const supabase = await createServiceRoleClient()

  const { data: session } = await supabase.from('sessions')
    .select('id, date_debut, date_fin, intitule, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial), organization:organization_id(name, logo_url)')
    .eq('id', params.cible).maybeSingle()

  let contexte: { type: 'entreprise' | 'financeur'; titre: string; sous: string; orgNom: string; logo: string | null }
  if (session) {
    const s: any = session
    contexte = {
      type: 'entreprise',
      titre: 'Votre appréciation sur la formation',
      sous: `${s.formation?.intitule || s.intitule || 'Formation'} — ${s.client?.nom_commercial || s.client?.raison_sociale || ''}${s.date_debut ? ` · ${new Date(s.date_debut).toLocaleDateString('fr-FR')}` : ''}`,
      orgNom: s.organization?.name || 'Lab Learning',
      logo: s.organization?.logo_url || null,
    }
  } else {
    const { data: org } = await supabase.from('organizations')
      .select('id, name, logo_url').eq('id', params.cible).maybeSingle()
    if (!org) notFound()
    contexte = {
      type: 'financeur',
      titre: 'Votre appréciation sur notre collaboration',
      sous: `${(org as any).name} sollicite votre regard de financeur sur la qualité de la relation et des dossiers.`,
      orgNom: (org as any).name,
      logo: (org as any).logo_url || null,
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-xl mx-auto px-5 py-12">
        <div className="text-center mb-8">
          {contexte.logo && <img src={contexte.logo} alt={contexte.orgNom} className="h-11 mx-auto mb-4 object-contain" />}
          <h1 className="text-2xl font-heading font-bold text-surface-900">{contexte.titre}</h1>
          <p className="text-sm text-surface-500 mt-2">{contexte.sous}</p>
        </div>
        <AppreciationForm cible={params.cible} type={contexte.type} />
      </div>
    </div>
  )
}
