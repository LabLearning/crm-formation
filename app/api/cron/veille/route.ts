/**
 * Cron mensuel — Agent de veille Qualiopi.
 * Pour chaque organisation, l'IA propose 1 brouillon de veille par type
 * (légale/métier/pédagogique/handicap). Les brouillons attendent une
 * VALIDATION humaine avant de compter pour les indicateurs 23-26.
 * On ne génère pas si des brouillons sont déjà en attente (anti-accumulation).
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateVeilleSuggestions } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const unauthorized = verifyCronSecret(req)
  if (unauthorized) return unauthorized

  const supabase = await createServiceRoleClient()
  const { data: orgs } = await supabase.from('organizations').select('id').eq('is_active', true)

  const today = new Date().toISOString().split('T')[0]
  let orgsProcessed = 0
  let draftsCreated = 0

  for (const org of orgs || []) {
    // Déjà des brouillons en attente ? on n'en rajoute pas.
    const { count: pending } = await supabase.from('veilles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id).eq('statut', 'brouillon')
    if (pending && pending > 0) { orgsProcessed++; continue }

    const gen = await generateVeilleSuggestions({ perType: 1 })
    if (!gen.success || gen.items.length === 0) { orgsProcessed++; continue }

    const rows = gen.items.map((it) => ({
      organization_id: org.id,
      type: it.type,
      titre: it.titre,
      source: it.source || null,
      date_veille: today,
      resume: it.resume || null,
      impact: it.impact || null,
      action: it.action || null,
      lien: it.lien || null,
      statut: 'brouillon' as const,
      genere_par_ia: true,
    }))
    const { data, error } = await supabase.from('veilles').insert(rows).select('id')
    if (!error) draftsCreated += data?.length || 0
    orgsProcessed++
  }

  return NextResponse.json({ orgs_processed: orgsProcessed, drafts_created: draftsCreated })
}
