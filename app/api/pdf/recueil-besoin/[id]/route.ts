import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { RecueilBesoinPDF } from '@/lib/pdf/recueil-besoin-pdf'

export const dynamic = 'force-dynamic'

const THEME_LABELS: Record<string, string> = {
  hygiene: 'Hygiène & sécurité alimentaire',
  prevention: 'Prévention & sécurité au travail',
  management: 'Management, gestion & performance',
  metier: 'Cœur de métier',
}

/** PDF du recueil du besoin d'une session (indicateur Qualiopi 4). `id` = session. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error
  const supabase = await createServiceRoleClient()
  const orgId = auth.user.organizationId

  const { data: session } = await supabase
    .from('sessions')
    .select('id, reference, intitule, date_debut, date_fin, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial)')
    .eq('id', params.id).eq('organization_id', orgId).single()
  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })

  const { data: recueil } = await supabase
    .from('recueils_besoin')
    .select('theme, reponses, date_recueil, statut, template_id, rempli_par')
    .eq('session_id', params.id).eq('organization_id', orgId).maybeSingle()
  if (!recueil) return NextResponse.json({ error: 'Aucun recueil du besoin pour cette session' }, { status: 404 })

  // Questions : celles du modèle utilisé, sinon celles du thème
  let questions: { id: string; label: string }[] = []
  if (recueil.template_id) {
    const { data: tpl } = await supabase.from('recueil_besoin_templates').select('questions').eq('id', recueil.template_id).maybeSingle()
    if (Array.isArray(tpl?.questions)) questions = tpl!.questions as any[]
  }
  if (questions.length === 0 && recueil.theme) {
    const { data: tpl } = await supabase.from('recueil_besoin_templates').select('questions')
      .eq('organization_id', orgId).eq('theme', recueil.theme).maybeSingle()
    if (Array.isArray(tpl?.questions)) questions = tpl!.questions as any[]
  }
  // Repli : reconstruire depuis les réponses enregistrées
  if (questions.length === 0) {
    questions = Object.keys(recueil.reponses || {}).map((k) => ({ id: k, label: k }))
  }

  let rempliPar: string | null = null
  if (recueil.rempli_par) {
    const { data: u } = await supabase.from('users').select('first_name, last_name').eq('id', recueil.rempli_par).maybeSingle()
    if (u) rempliPar = `${u.first_name || ''} ${u.last_name || ''}`.trim() || null
  }

  const { data: orgRaw } = await supabase.from('organizations').select('*').eq('id', orgId).single()
  const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
  const org = await withDocumentLogo(supabase, orgRaw)

  const buffer = await renderToBuffer(
    createElement(RecueilBesoinPDF, {
      org,
      session,
      formation: (session as any).formation,
      client: (session as any).client,
      theme: recueil.theme,
      themeLabel: THEME_LABELS[recueil.theme || ''] || 'Recueil du besoin',
      questions,
      reponses: (recueil.reponses || {}) as Record<string, string>,
      dateRecueil: recueil.date_recueil,
      rempliPar,
    }) as any,
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recueil-besoin-${session.reference || session.id}.pdf"`,
      'Cache-Control': 'private, max-age=0',
    },
  })
}
