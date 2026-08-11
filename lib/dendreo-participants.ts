/**
 * Reprise des participants Dendreo sur les sessions qui n'en ont aucun.
 *
 * 61 actions de formation reprises de Dendreo se retrouvaient sans aucun
 * stagiaire dans le CRM : le lien action ↔ participant n'avait pas été importé.
 * Une action sans stagiaire ne peut ni émarger, ni être évaluée, ni être
 * facturée correctement — et pour l'auditeur, elle n'a tout simplement pas eu
 * lieu.
 *
 * `laps.php?id_action_de_formation=` donne les participants avec leur identité
 * complète et leur présence.
 */
import { fetchAllPaged } from '@/lib/supabase/fetch-all'

export interface ResumeParticipants {
  sessions_traitees: number
  apprenants_crees: number
  inscriptions_creees: number
  sessions_sans_participant: number
  erreurs: number
}

async function dendreo(chemin: string): Promise<any[]> {
  const base = process.env.DENDREO_API_BASE
  const key = process.env.DENDREO_API_KEY
  if (!base || !key) throw new Error('Accès Dendreo non configuré')
  for (let essai = 0; essai < 4; essai++) {
    const r = await fetch(base + chemin, { headers: { Authorization: `Token token="${key}"` } })
    if (r.ok) {
      const d = await r.json()
      return Array.isArray(d) ? d : []
    }
    await new Promise((ok) => setTimeout(ok, 1200))
  }
  return []
}

const propre = (v: any) => {
  const s = String(v ?? '').trim()
  return s || null
}

export async function importerParticipantsManquants(
  supabase: any,
  organizationId: string,
  opts?: { sessionIds?: string[] },
): Promise<ResumeParticipants> {
  const sessions = await fetchAllPaged((from, to) =>
    supabase.from('sessions')
      .select('id, reference, dendreo_id, client_id')
      .eq('organization_id', organizationId)
      .not('dendreo_id', 'is', null)
      .range(from, to),
  )
  const inscriptions = await fetchAllPaged((from, to) =>
    supabase.from('inscriptions').select('session_id').eq('organization_id', organizationId).range(from, to),
  )
  const avecInscrits = new Set(inscriptions.map((i: any) => i.session_id))

  let cibles = sessions.filter((s: any) => !avecInscrits.has(s.id))
  if (opts?.sessionIds) cibles = cibles.filter((s: any) => opts.sessionIds!.includes(s.id))

  // Apprenants déjà repris, indexés sur leur identifiant Dendreo
  const apprenants = await fetchAllPaged((from, to) =>
    supabase.from('apprenants').select('id, dendreo_id').eq('organization_id', organizationId).not('dendreo_id', 'is', null).range(from, to),
  )
  const parDendreo = new Map(apprenants.map((a: any) => [String(a.dendreo_id), a.id]))

  const resume: ResumeParticipants = {
    sessions_traitees: 0, apprenants_crees: 0, inscriptions_creees: 0,
    sessions_sans_participant: 0, erreurs: 0,
  }

  for (const s of cibles) {
    const laps = await dendreo(`/laps.php?id_action_de_formation=${s.dendreo_id}`)
    if (laps.length === 0) { resume.sessions_sans_participant++; continue }

    const aInscrire: string[] = []
    for (const lap of laps) {
      const idParticipant = String(lap.id_participant || '')
      if (!idParticipant) continue

      let apprenantId = parDendreo.get(idParticipant)
      if (!apprenantId) {
        const p = lap.participant || {}
        const { data: cree, error } = await supabase.from('apprenants').insert({
          organization_id: organizationId,
          dendreo_id: idParticipant,
          nom: propre(p.nom) || 'Stagiaire',
          prenom: propre(p.prenom),
          email: propre(p.email),
          telephone: propre(p.telephone) || propre(p.portable),
          date_naissance: propre(p.date_de_naissance),
          client_id: s.client_id || null,
        }).select('id').single()
        if (error || !cree) { resume.erreurs++; continue }
        apprenantId = cree.id
        parDendreo.set(idParticipant, apprenantId)
        resume.apprenants_crees++
      }
      aInscrire.push(apprenantId as string)
    }

    if (aInscrire.length === 0) { resume.sessions_sans_participant++; continue }

    const { error } = await supabase.from('inscriptions').insert(
      [...new Set(aInscrire)].map((apprenantId) => ({
        organization_id: organizationId,
        session_id: s.id,
        apprenant_id: apprenantId,
        status: 'inscrit',
      })),
    )
    if (error) { resume.erreurs++; continue }

    resume.inscriptions_creees += new Set(aInscrire).size
    resume.sessions_traitees++

    // Les stagiaires doivent apparaître dans les questionnaires de la session.
    try {
      const { lierInscritsAuxQcmSession } = await import('@/lib/qcm-auto-seed')
      await lierInscritsAuxQcmSession(supabase, s.id)
    } catch (e) {
      console.error('[lien qcm]', e)
    }
  }

  return resume
}
