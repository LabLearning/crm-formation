/**
 * Unicité du SIRET dans l'organisation, CROSS-entité : un même SIRET ne peut
 * exister qu'une fois, qu'il soit porté par un client OU par un lead.
 */
export function normalizeSiret(s?: string | null): string {
  return (s || '').replace(/\D/g, '')
}

export interface SiretOwner { type: 'client' | 'lead'; label: string }

/**
 * Retourne le propriétaire d'un SIRET déjà présent (client ou lead), ou null.
 * `exclude` permet d'ignorer l'enregistrement en cours d'édition.
 */
export async function findSiretOwner(
  supabase: any,
  organizationId: string,
  siretNorm: string,
  exclude?: { clientId?: string; leadId?: string },
): Promise<SiretOwner | null> {
  if (!siretNorm) return null

  let cq = supabase.from('clients').select('id, raison_sociale, siret')
    .eq('organization_id', organizationId).not('siret', 'is', null)
  if (exclude?.clientId) cq = cq.neq('id', exclude.clientId)
  const { data: clients } = await cq
  const dupC = (clients || []).find((c: any) => normalizeSiret(c.siret) === siretNorm)
  if (dupC) return { type: 'client', label: dupC.raison_sociale || 'client existant' }

  // On ignore les leads clôturés (gagné → devenu client, ou perdu) : ils ne
  // doivent pas bloquer une nouvelle saisie.
  let lq = supabase.from('leads').select('id, entreprise, siret, contact_nom')
    .eq('organization_id', organizationId).not('siret', 'is', null)
    .not('status', 'in', '("gagne","perdu")')
  if (exclude?.leadId) lq = lq.neq('id', exclude.leadId)
  const { data: leads } = await lq
  const dupL = (leads || []).find((l: any) => normalizeSiret(l.siret) === siretNorm)
  if (dupL) return { type: 'lead', label: dupL.entreprise || dupL.contact_nom || 'lead existant' }

  return null
}

/** Message d'erreur homogène. */
export function siretDuplicateMessage(owner: SiretOwner): string {
  const where = owner.type === 'client' ? 'client' : 'lead'
  return `Ce SIRET est déjà sur la plateforme (${where} : ${owner.label}).`
}
