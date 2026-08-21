import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessagesFormateurClient } from './MessagesFormateurClient'
import { ToastProvider } from '@/components/ui'

export const dynamic = 'force-dynamic'

/**
 * Messagerie du formateur : les fils ouverts par ses apprenants, réponse
 * directe depuis son espace. Les messages apprenants sont marqués lus à
 * l'ouverture.
 */
export default async function PortalMessagesPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'formateur') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()
  const { data: messages } = await supabase
    .from('portal_messages')
    .select('id, apprenant_id, auteur, contenu, lu, created_at, apprenant:apprenant_id(prenom, nom, entreprise)')
    .eq('formateur_id', context.formateur.id)
    .order('created_at')

  await supabase.from('portal_messages')
    .update({ lu: true })
    .eq('formateur_id', context.formateur.id)
    .eq('auteur', 'apprenant')
    .eq('lu', false)

  return <ToastProvider><MessagesFormateurClient token={params.token} messages={(messages || []) as any[]} /></ToastProvider>
}
