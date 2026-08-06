/**
 * Synchronisation AuditHygiène Pro → CRM.
 *
 * L'outil terrain (projet Supabase distinct) reste la source de vérité : on ne
 * lui écrit jamais rien. On recopie ici les établissements, les audits hygiène,
 * les DUERP et leur plan d'action, en rattachant chaque établissement à un
 * client du CRM. Le rapprochement automatique se fait sur le SIREN, puis sur
 * nom + ville ; un rapprochement validé à la main n'est jamais écrasé.
 */
import { createClient } from '@supabase/supabase-js'
import { fetchAllPaged } from '@/lib/supabase/fetch-all'

export interface ResumeSync {
  etablissements: number
  audits: number
  duerps: number
  actions: number
  rapproches_auto: number
  orphelins: number
}

export function auditHygieneClient() {
  const url = process.env.AUDITHYGIENE_SUPABASE_URL
  const key = process.env.AUDITHYGIENE_SERVICE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

const sourceAll = async (client: any, table: string, select = '*') => {
  let out: any[] = []
  let from = 0
  for (;;) {
    const { data, error } = await client.from(table).select(select).range(from, from + 999)
    if (error) throw new Error(`${table} : ${error.message}`)
    out = out.concat(data || [])
    if (!data || data.length < 1000) break
    from += 1000
  }
  return out
}

// ── Rapprochement ───────────────────────────────────────────────────────────

export const normaliser = (s: unknown) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()

/** La ville de l'outil terrain contient parfois le code postal collé. */
export const villeSeule = (s: unknown) => normaliser(String(s || '').replace(/\b\d{5}\b/g, ''))

const siren = (s: unknown) => {
  const d = String(s || '').replace(/\D/g, '')
  return d.length >= 9 ? d.slice(0, 9) : ''
}

export interface ClientIndex {
  parSiren: Map<string, string>
  parNomVille: Map<string, string>
  parNom: Map<string, string | null>   // null = ambigu (plusieurs clients)
}

export function indexerClients(clients: any[]): ClientIndex {
  const parSiren = new Map<string, string>()
  const parNomVille = new Map<string, string>()
  const parNom = new Map<string, string | null>()
  for (const c of clients) {
    const s = siren(c.siret)
    if (s) parSiren.set(s, c.id)
    for (const nom of [c.raison_sociale, c.nom_commercial]) {
      if (!nom) continue
      parNomVille.set(`${normaliser(nom)}|${villeSeule(c.ville)}`, c.id)
      const k = normaliser(nom)
      parNom.set(k, parNom.has(k) && parNom.get(k) !== c.id ? null : c.id)
    }
  }
  return { parSiren, parNomVille, parNom }
}

export function rapprocher(
  etab: { nom?: string | null; ville?: string | null; siret?: string | null },
  idx: ClientIndex,
): { client_id: string | null; methode: string | null } {
  const s = siren(etab.siret)
  if (s && idx.parSiren.has(s)) return { client_id: idx.parSiren.get(s)!, methode: 'siren' }
  const kv = `${normaliser(etab.nom)}|${villeSeule(etab.ville)}`
  if (idx.parNomVille.has(kv)) return { client_id: idx.parNomVille.get(kv)!, methode: 'nom_ville' }
  const kn = normaliser(etab.nom)
  const unique = idx.parNom.get(kn)
  if (unique) return { client_id: unique, methode: 'nom' }
  return { client_id: null, methode: null }
}

/** Clients les plus proches d'un établissement orphelin, pour l'écran de rapprochement. */
export function suggestions(
  etab: { nom?: string | null; ville?: string | null },
  clients: any[],
  max = 5,
) {
  const nom = normaliser(etab.nom)
  const ville = villeSeule(etab.ville)
  const mots = new Set(nom.split(' ').filter((m) => m.length > 2))
  const notes = clients.map((c) => {
    const cn = normaliser(c.raison_sociale || c.nom_commercial)
    const cmots = new Set(cn.split(' ').filter((m) => m.length > 2))
    let communs = 0
    for (const m of mots) if (cmots.has(m)) communs++
    let note = mots.size ? communs / mots.size : 0
    if (cn.includes(nom) || nom.includes(cn)) note += 0.4
    if (ville && villeSeule(c.ville) === ville) note += 0.5
    return { client: c, note }
  })
  return notes.filter((n) => n.note >= 0.4).sort((a, b) => b.note - a.note).slice(0, max)
}

// ── Synchronisation ─────────────────────────────────────────────────────────

export async function synchroniserAuditHygiene(
  crm: any,
  organizationId: string,
  userId?: string | null,
): Promise<{ success: boolean; error?: string; resume?: ResumeSync }> {
  const source = auditHygieneClient()
  if (!source) {
    return { success: false, error: "Accès AuditHygiène non configuré (AUDITHYGIENE_SUPABASE_URL / AUDITHYGIENE_SERVICE_KEY)" }
  }

  const { data: journal } = await crm
    .from('ah_syncs')
    .insert({ organization_id: organizationId, lance_par: userId || null })
    .select('id')
    .single()

  const finir = async (succes: boolean, resume: Partial<ResumeSync>, erreur?: string) => {
    if (journal?.id) {
      await crm.from('ah_syncs')
        .update({ termine_at: new Date().toISOString(), succes, erreur: erreur || null, resume })
        .eq('id', journal.id)
    }
  }

  try {
    const [etabs, audits, duerps, unites, risques, actions] = await Promise.all([
      sourceAll(source, 'etablissements'),
      sourceAll(source, 'audits', 'id, etablissement_id, formateur_nom, date_audit, heure_debut, heure_fin, type_audit, num_rapport, personnes_presentes, score_global, nb_conformes, nb_partiels, nb_non_conformes, mention, obs_bilan, obs_actions, obs_reco, obs_next, obs_delai, statut, email_envoye_at, created_at, updated_at'),
      sourceAll(source, 'duerps', 'id, etablissement_id, formateur_nom, date_evaluation, effectif, num_document, statut, raison_sociale, enseigne, activite, dirigeant_signataire, preventeur, perimetre, version_int, email_envoye_at, created_at, updated_at'),
      sourceAll(source, 'duerp_unites_travail', 'id, duerp_id'),
      sourceAll(source, 'duerp_risques', 'id, unite_id, gravite, probabilite'),
      sourceAll(source, 'duerp_actions', 'id, duerp_id, description, responsable, echeance, statut, cout_estime, created_at'),
    ])

    // Clients du CRM pour le rapprochement
    const clients = await fetchAllPaged((from, to) =>
      crm.from('clients')
        .select('id, raison_sociale, nom_commercial, siret, ville')
        .eq('organization_id', organizationId)
        .range(from, to),
    )
    const idx = indexerClients(clients as any[])

    // Rapprochements déjà validés à la main : on ne les écrase jamais
    const { data: existants } = await crm
      .from('ah_etablissements')
      .select('source_id, client_id, match_methode, match_valide_at, ignore_rapprochement')
      .eq('organization_id', organizationId)
    const dejaLa = new Map((existants || []).map((e: any) => [e.source_id, e]))

    let rapprochesAuto = 0
    const lignesEtab = etabs.map((e) => {
      const anterieur: any = dejaLa.get(e.id)
      const manuel = anterieur?.match_valide_at || anterieur?.ignore_rapprochement
      const auto = manuel ? null : rapprocher(e, idx)
      if (auto?.client_id) rapprochesAuto++
      return {
        organization_id: organizationId,
        source_id: e.id,
        nom: e.nom || 'Sans nom',
        type_etab: e.type_etab || null,
        adresse: e.adresse || null,
        code_postal: e.code_postal || null,
        ville: e.ville || null,
        contact: e.contact || null,
        tel: e.tel || null,
        email: e.email || null,
        siret: e.siret || null,
        latitude: e.latitude ?? null,
        longitude: e.longitude ?? null,
        client_id: manuel ? anterieur.client_id : auto!.client_id,
        match_methode: manuel ? anterieur.match_methode : auto!.methode,
        source_created_at: e.created_at || null,
        synced_at: new Date().toISOString(),
      }
    })

    await upsertParLots(crm, 'ah_etablissements', lignesEtab)

    // source_id → id local
    const { data: locaux } = await crm
      .from('ah_etablissements').select('id, source_id, client_id').eq('organization_id', organizationId)
    const idLocal = new Map((locaux || []).map((r: any) => [r.source_id, r.id]))

    await upsertParLots(crm, 'ah_audits', audits.map((a) => ({
      organization_id: organizationId,
      source_id: a.id,
      etablissement_id: idLocal.get(a.etablissement_id) || null,
      num_rapport: a.num_rapport || null,
      date_audit: a.date_audit || null,
      heure_debut: a.heure_debut || null,
      heure_fin: a.heure_fin || null,
      type_audit: a.type_audit || null,
      formateur_nom: a.formateur_nom || null,
      score_global: a.score_global ?? null,
      mention: a.mention || null,
      nb_conformes: a.nb_conformes ?? null,
      nb_partiels: a.nb_partiels ?? null,
      nb_non_conformes: a.nb_non_conformes ?? null,
      personnes_presentes: typeof a.personnes_presentes === 'string' ? a.personnes_presentes : JSON.stringify(a.personnes_presentes ?? null),
      obs_bilan: a.obs_bilan || null,
      obs_actions: a.obs_actions || null,
      obs_reco: a.obs_reco || null,
      obs_next: a.obs_next || null,
      obs_delai: a.obs_delai || null,
      statut: a.statut || null,
      email_envoye_at: a.email_envoye_at || null,
      source_created_at: a.created_at || null,
      source_updated_at: a.updated_at || null,
      synced_at: new Date().toISOString(),
    })))

    // Compteurs DUERP
    const uniteDuerp = new Map(unites.map((u) => [u.id, u.duerp_id]))
    const nbUnites: Record<string, number> = {}
    for (const u of unites) nbUnites[u.duerp_id] = (nbUnites[u.duerp_id] || 0) + 1
    const nbRisques: Record<string, number> = {}
    const nbCritiques: Record<string, number> = {}
    for (const r of risques) {
      const d = uniteDuerp.get(r.unite_id)
      if (!d) continue
      nbRisques[d] = (nbRisques[d] || 0) + 1
      if ((Number(r.gravite) || 0) * (Number(r.probabilite) || 0) >= 9) nbCritiques[d] = (nbCritiques[d] || 0) + 1
    }
    const nbActions: Record<string, number> = {}
    for (const a of actions) nbActions[a.duerp_id] = (nbActions[a.duerp_id] || 0) + 1

    await upsertParLots(crm, 'ah_duerps', duerps.map((d) => ({
      organization_id: organizationId,
      source_id: d.id,
      etablissement_id: idLocal.get(d.etablissement_id) || null,
      num_document: d.num_document || null,
      date_evaluation: d.date_evaluation || null,
      formateur_nom: d.formateur_nom || null,
      effectif: d.effectif ?? null,
      statut: d.statut || null,
      raison_sociale: d.raison_sociale || null,
      enseigne: d.enseigne || null,
      activite: d.activite || null,
      dirigeant_signataire: d.dirigeant_signataire || null,
      preventeur: d.preventeur || null,
      perimetre: d.perimetre || null,
      version_int: d.version_int ?? null,
      nb_unites: nbUnites[d.id] || 0,
      nb_risques: nbRisques[d.id] || 0,
      nb_actions: nbActions[d.id] || 0,
      risques_critiques: nbCritiques[d.id] || 0,
      email_envoye_at: d.email_envoye_at || null,
      source_created_at: d.created_at || null,
      source_updated_at: d.updated_at || null,
      synced_at: new Date().toISOString(),
    })))

    const { data: duerpsLocaux } = await crm
      .from('ah_duerps').select('id, source_id').eq('organization_id', organizationId)
    const idDuerp = new Map((duerpsLocaux || []).map((r: any) => [r.source_id, r.id]))

    await upsertParLots(crm, 'ah_duerp_actions', actions.map((a) => ({
      organization_id: organizationId,
      source_id: a.id,
      duerp_id: idDuerp.get(a.duerp_id) || null,
      description: a.description || null,
      responsable: a.responsable || null,
      echeance: a.echeance || null,
      statut: a.statut || null,
      cout_estime: a.cout_estime ?? null,
      source_created_at: a.created_at || null,
      synced_at: new Date().toISOString(),
    })))

    // Ce qui a été supprimé côté outil terrain disparaît aussi du miroir
    // (l'outil est nettoyé régulièrement : doublons d'établissements, brouillons).
    await purger(crm, 'ah_audits', organizationId, audits.map((a) => a.id))
    await purger(crm, 'ah_duerp_actions', organizationId, actions.map((a) => a.id))
    await purger(crm, 'ah_duerps', organizationId, duerps.map((d) => d.id))
    await purger(crm, 'ah_etablissements', organizationId, etabs.map((e) => e.id))

    const orphelins = lignesEtab.filter((l) => !l.client_id).length
    const resume: ResumeSync = {
      etablissements: lignesEtab.length,
      audits: audits.length,
      duerps: duerps.length,
      actions: actions.length,
      rapproches_auto: rapprochesAuto,
      orphelins,
    }
    await finir(true, resume)
    return { success: true, resume }
  } catch (e: any) {
    const message = e?.message || 'Erreur inconnue'
    console.error('[sync audithygiene]', message)
    await finir(false, {}, message)
    return { success: false, error: message }
  }
}

/** Supprime du miroir les lignes dont la source n'existe plus. */
async function purger(crm: any, table: string, organizationId: string, sourceIds: string[]) {
  const { data: locales } = await crm.from(table).select('id, source_id').eq('organization_id', organizationId)
  const vivants = new Set(sourceIds)
  const aSupprimer = (locales || []).filter((r: any) => !vivants.has(r.source_id)).map((r: any) => r.id)
  for (let i = 0; i < aSupprimer.length; i += 500) {
    const { error } = await crm.from(table).delete().in('id', aSupprimer.slice(i, i + 500))
    if (error) throw new Error(`${table} (purge) : ${error.message}`)
  }
  return aSupprimer.length
}

async function upsertParLots(crm: any, table: string, lignes: any[], taille = 500) {
  for (let i = 0; i < lignes.length; i += taille) {
    const { error } = await crm.from(table)
      .upsert(lignes.slice(i, i + taille), { onConflict: 'organization_id,source_id' })
    if (error) throw new Error(`${table} : ${error.message}`)
  }
}
