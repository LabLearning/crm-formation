/**
 * Notifie tous les comptes franchise (role='franchise') rattachés à une franchise.
 * Best-effort : n'interrompt jamais l'action appelante en cas d'erreur.
 */
export async function notifyFranchiseUsers(
  supabase: any,
  franchiseId: string | null | undefined,
  organizationId: string,
  notif: { titre: string; message: string; type?: string; lienUrl?: string; lienLabel?: string; entityType?: string; entityId?: string },
) {
  if (!franchiseId) return
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('franchise_id', franchiseId)
      .eq('role', 'franchise')
      .eq('status', 'active')

    if (!users || users.length === 0) return

    const { createNotifications } = await import('@/lib/email')
    await createNotifications(
      users.map((u: any) => ({
        organizationId,
        userId: u.id,
        titre: notif.titre,
        message: notif.message,
        type: notif.type || 'info',
        lienUrl: notif.lienUrl,
        lienLabel: notif.lienLabel,
        entityType: notif.entityType,
        entityId: notif.entityId,
      })),
    )
  } catch (e) {
    console.error('[notifyFranchiseUsers]', e)
  }
}
