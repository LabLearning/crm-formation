import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { NOMS_ACTIONS, executerAction } from '@/lib/assistant/actions-outils'
import { logAudit } from '@/lib/audit'

export const maxDuration = 60

/**
 * Exécution d'une action proposée par l'assistant, APRÈS confirmation
 * explicite de l'utilisateur dans l'interface. Mêmes gardes de rôle que le
 * chat, action journalisée dans l'audit.
 */
const ROLES_EQUIPE = ['super_admin', 'admin', 'gestionnaire', 'commercial', 'manager']

export async function POST(req: Request) {
  let session
  try {
    session = await getSession()
  } catch {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const { user, organization } = session
  if (!ROLES_EQUIPE.includes(user.role)) {
    return NextResponse.json({ error: 'Accès réservé à l’équipe interne' }, { status: 403 })
  }

  const corps = await req.json().catch(() => null)
  const type = String(corps?.type || '')
  const params = corps?.params || {}
  if (!NOMS_ACTIONS.has(type)) return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  const resultat = await executerAction(type, params, organization.id)

  try {
    await logAudit({
      action: 'assistant_action',
      entity_type: 'assistant',
      entity_id: params.session_id || params.facture_id || undefined,
      details: { type, params, success: resultat.success, message: resultat.message },
    })
  } catch { /* l'audit ne doit jamais bloquer l'action */ }

  return NextResponse.json(resultat)
}
