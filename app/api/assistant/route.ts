import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { OUTILS_ASSISTANT, executerOutil } from '@/lib/assistant/outils'
import { OUTILS_ACTIONS, NOMS_ACTIONS, type PropositionAction } from '@/lib/assistant/actions-outils'

export const maxDuration = 60

/**
 * Assistant CRM interne : boucle d'agent Claude avec outils de lecture du CRM.
 * Réservé à l'équipe (jamais aux comptes formateur/apprenant) ; chaque outil
 * est scopé sur l'organisation de la session — l'IA ne choisit pas l'org.
 */
const ROLES_EQUIPE = ['super_admin', 'admin', 'gestionnaire', 'commercial', 'manager']
const MODELE = 'claude-opus-5'
const MAX_TOURS = 6

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
  const claudeKey = process.env.ANTHROPIC_API_KEY
  if (!claudeKey) return NextResponse.json({ error: 'Clé IA non configurée' }, { status: 500 })

  const corps = await req.json().catch(() => null)
  const historique: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(corps?.messages) ? corps.messages : []
  if (!historique.length || historique[historique.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Message manquant' }, { status: 400 })
  }

  const systeme = [
    `Tu es Starkk, l'assistant IA interne du CRM de ${organization.name}, un organisme de formation certifié Qualiopi (métiers de bouche et restauration).`,
    `Ton style : efficace et direct, avec une pointe d'esprit sobre à la Jarvis (le majordome brillant qui a toujours un coup d'avance) — jamais de familiarité avec les données ni de blabla.`,
    `Tu réponds à ${(user as any).first_name || 'un membre'} de l'équipe (rôle : ${user.role}). Nous sommes le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`,
    `RÈGLES :`,
    `- Pour toute question factuelle (une session, un client, un document, un chiffre), utilise TOUJOURS les outils avant de répondre. N'invente jamais une donnée ni un lien.`,
    `- Donne les liens en markdown : [Fiche de la session](/dashboard/sessions/xxx), [Convention signée (PDF)](/api/pdf/convention/xxx). L'utilisateur est connecté au CRM, les liens s'ouvrent directement.`,
    `- Réponds en français, court et précis. Dates au format « 28 juillet 2026 », montants en euros.`,
    `- Si une recherche ne donne rien, dis-le et propose une orthographe ou un angle différent.`,
    `- ACTIONS : tu peux PROPOSER certaines actions (convocation, convention, relance de facture) via les outils action_*. Elles ne s'exécutent JAMAIS directement : l'utilisateur les confirme d'un clic dans l'interface. Propose une action seulement quand on te le demande clairement, avec un libellé précis (qui, quoi, quel montant). Pour tout le reste (modifier un statut, créer une fiche…), indique où le faire dans le CRM avec le lien.`,
    `- Vocabulaire : jamais d'emoji ni de tiret cadratin.`,
  ].join('\n')

  // Boucle d'agent : le modèle appelle les outils jusqu'à sa réponse finale.
  // Les outils action_* ne s'exécutent pas : ils deviennent des propositions
  // renvoyées au client, que l'utilisateur confirme d'un clic.
  const messages: any[] = historique.slice(-16)
  const propositions: PropositionAction[] = []
  try {
    for (let tour = 0; tour < MAX_TOURS; tour++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: MODELE,
          max_tokens: 2500,
          system: systeme,
          tools: [...OUTILS_ASSISTANT, ...OUTILS_ACTIONS],
          messages,
        }),
      })
      if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const rep = await r.json()
      const appels = (rep.content || []).filter((c: any) => c.type === 'tool_use')

      if (rep.stop_reason !== 'tool_use' || appels.length === 0) {
        // Réponse finale : ne garder que les blocs texte (jamais le thinking).
        const texte = (rep.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim()
        return NextResponse.json({ reponse: texte || 'Je n’ai pas de réponse à te donner sur ce point.', actions: propositions })
      }

      messages.push({ role: 'assistant', content: rep.content })
      const resultats = await Promise.all(appels.map(async (a: any) => {
        if (NOMS_ACTIONS.has(a.name)) {
          propositions.push({ id: a.id, type: a.name, params: a.input || {}, libelle: a.input?.libelle || a.name })
          return {
            type: 'tool_result',
            tool_use_id: a.id,
            content: JSON.stringify({ statut: 'proposee', info: "L'action est affichée à l'utilisateur avec un bouton de confirmation. Elle ne sera exécutée que s'il confirme. Dis-lui simplement qu'elle attend sa confirmation." }),
          }
        }
        return {
          type: 'tool_result',
          tool_use_id: a.id,
          content: JSON.stringify(await executerOutil(a.name, a.input || {}, organization.id)).slice(0, 24000),
        }
      }))
      messages.push({ role: 'user', content: resultats })
    }
    return NextResponse.json({ reponse: 'La recherche est trop longue, reformule ta demande de façon plus précise.', actions: propositions })
  } catch (e: any) {
    console.error('[assistant]', e)
    return NextResponse.json({ error: 'L’assistant est indisponible pour le moment. Réessaie dans un instant.' }, { status: 500 })
  }
}
