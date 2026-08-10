/**
 * Reprise des financements Dendreo sur les sessions du CRM.
 *
 * Le CRM affichait 316 sessions 2026 « sans facture » alors que 158 étaient
 * déjà facturées depuis Dendreo : les 169 factures reprises n'étaient reliées
 * à aucune session. L'API Dendreo n'expose pas le lien facture → action de
 * formation, mais `financements.php` porte `id_action_de_formation` et, pour
 * chaque financement, le montant déjà facturé.
 *
 * On recopie donc sur la session : l'OPCO, le numéro de dossier, le montant
 * financé et le montant déjà facturé ailleurs — ce dernier servant de garde-fou
 * contre une double facturation.
 */
import { fetchAllPaged } from '@/lib/supabase/fetch-all'

export interface ResumeFinancements {
  financements_lus: number
  sessions_mises_a_jour: number
  deja_facturees: number
  a_facturer: number
  sans_correspondance: number
}

async function dendreo(chemin: string): Promise<any[]> {
  const base = process.env.DENDREO_API_BASE
  const key = process.env.DENDREO_API_KEY
  if (!base || !key) throw new Error('Accès Dendreo non configuré')

  // L'API se protège des rafales : on réessaie avant d'abandonner.
  for (let essai = 0; essai < 4; essai++) {
    const r = await fetch(base + chemin, { headers: { Authorization: `Token token="${key}"` } })
    if (r.ok) return r.json()
    await new Promise((ok) => setTimeout(ok, 1200))
  }
  throw new Error(`Dendreo : ${chemin} injoignable`)
}

/** Correspondance code financeur Dendreo → OPCO du CRM, par nom. */
function trouverOpco(nomFinanceur: string, opcos: any[]): string | null {
  const n = String(nomFinanceur || '').toUpperCase()
  if (!n) return null
  for (const o of opcos) {
    const code = String(o.code || '').replace(/_/g, ' ').toUpperCase()
    const nom = String(o.nom || '').toUpperCase()
    if (n.includes(code) || n.includes(nom)) return o.id
  }
  return null
}

export async function importerFinancementsDendreo(
  supabase: any,
  organizationId: string,
): Promise<ResumeFinancements> {
  const financements = await dendreo('/financements.php?per_page=5000')

  const { data: opcos } = await supabase.from('opco').select('id, code, nom')

  const sessions = await fetchAllPaged((from, to) =>
    supabase.from('sessions')
      .select('id, dendreo_id, client_id')
      .eq('organization_id', organizationId)
      .not('dendreo_id', 'is', null)
      .range(from, to),
  )
  const parDendreoId = new Map(sessions.map((s: any) => [String(s.dendreo_id), s]))

  // Un même dossier peut porter plusieurs financements : on les cumule.
  const parAction = new Map<string, any[]>()
  for (const f of financements) {
    const k = String(f.id_action_de_formation || '')
    if (!k) continue
    parAction.set(k, [...(parAction.get(k) || []), f])
  }

  const resume: ResumeFinancements = {
    financements_lus: financements.length,
    sessions_mises_a_jour: 0,
    deja_facturees: 0,
    a_facturer: 0,
    sans_correspondance: 0,
  }

  const maintenant = new Date().toISOString()
  for (const [actionId, fs] of parAction) {
    const session: any = parDendreoId.get(actionId)
    if (!session) { resume.sans_correspondance++; continue }

    const finance = fs.reduce((a, f) => a + Number(f.montant_total_finance || 0), 0)
    const facture = fs.reduce((a, f) => a + Number(f.montant_total_facture || 0), 0)
    const dossier = fs.map((f) => f.numero_dossier).find(Boolean) || null
    const opcoId = trouverOpco(fs[0]?.raison_sociale || fs[0]?.nom_financeur || '', opcos || [])

    const { error } = await supabase.from('sessions').update({
      ...(opcoId ? { opco_id: opcoId } : {}),
      numero_dossier_opco: dossier,
      montant_finance_opco: finance || null,
      deja_facture_ailleurs: facture,
      financement_synced_at: maintenant,
    }).eq('id', session.id)

    if (error) {
      console.error('[financements dendreo]', error.message)
      continue
    }
    resume.sessions_mises_a_jour++
    if (facture > 0) resume.deja_facturees++
    else if (finance > 0) resume.a_facturer++
  }

  return resume
}
