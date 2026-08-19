import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveFormateur } from '../../_formateur/guard'
import { formatDate } from '@/lib/utils'
import { RapportForm } from './RapportForm'

export const dynamic = 'force-dynamic'

/**
 * Rapport de fin de session, rempli par le formateur depuis son espace et
 * transmis au gestionnaire — il rejoint le dossier de la session (fiche
 * session, onglet rapport) et nourrit l'amélioration continue.
 */
export default async function RapportPage({ params }: { params: { sessionId: string } }) {
  const { formateurId } = await resolveFormateur()
  const supabase = await createServiceRoleClient()

  const { data: sess } = await supabase.from('sessions')
    .select('id, reference, intitule, date_debut, date_fin, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial)')
    .eq('id', params.sessionId).eq('formateur_id', formateurId).maybeSingle()

  if (!sess) {
    return (
      <div className="card p-10 text-center text-sm text-surface-500">
        Session introuvable ou hors de votre périmètre.
      </div>
    )
  }

  const { data: rapport } = await supabase.from('rapports_session')
    .select('*').eq('session_id', params.sessionId).eq('formateur_id', formateurId).maybeSingle()

  const s: any = sess
  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <Link href="/mon-espace/sessions" className="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Mes sessions
        </Link>
        <h1 className="text-xl font-heading font-bold text-surface-900 flex items-center gap-2 mt-1">
          <ClipboardList className="h-5 w-5 text-brand-500" /> Rapport de session
        </h1>
        <p className="text-sm text-surface-500 mt-1">
          {s.formation?.intitule || s.intitule || 'Session'}
          {s.client ? ` · ${s.client.nom_commercial || s.client.raison_sociale}` : ''}
          {s.date_debut ? ` · ${formatDate(s.date_debut, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          {s.reference ? ` · ${s.reference}` : ''}
        </p>
      </div>

      <RapportForm
        sessionId={params.sessionId}
        initial={rapport as any}
        transmis={rapport?.status === 'soumis' || rapport?.status === 'valide'}
      />
    </div>
  )
}
