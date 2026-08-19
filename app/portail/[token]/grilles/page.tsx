import { redirect } from 'next/navigation'
import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { GrillesClient } from './GrillesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Grilles de saisie — Lab Learning' }

const JALONS: Record<string, string> = {
  positionnement: 'Positionnement (entrée)',
  entree: 'Positionnement (entrée)',
  sortie: 'Évaluation des acquis (sortie)',
  satisfaction_chaud: 'Satisfaction à chaud',
}

/**
 * Saisie en ligne des questionnaires par le formateur, session par session :
 * les questions en lignes, ses stagiaires en colonnes, et l'enregistrement
 * écrit directement les réponses dans le CRM (notation partagée — score,
 * détail, progression). Seuls les stagiaires non encore saisis apparaissent.
 */
export default async function GrillesPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'formateur') redirect('/portail/expired')
  const supabase = await createServiceRoleClient()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, reference, date_debut, date_fin, intitule, client:client_id(raison_sociale, nom_commercial), formation:formation_id(intitule)')
    .eq('formateur_id', (context as any).formateur.id)
    .not('reference', 'like', 'BPF-%')
    .order('date_debut', { ascending: false })
    .range(0, 499)

  const ids = (sessions || []).map((s: any) => s.id)
  if (!ids.length) return <GrillesClient formateur={(context as any).formateur} token={params.token} sessions={[]} />

  const seq = async (table: string, cols: string, col: string) => {
    const out: any[] = []
    for (let i = 0; i < ids.length; i += 80) {
      const { data } = await supabase.from(table).select(cols).in(col, ids.slice(i, i + 80))
      out.push(...(data || []))
    }
    return out
  }
  const [liens, inscriptions, reponses] = await Promise.all([
    seq('qcm_sessions', 'session_id, qcm_id', 'session_id'),
    seq('inscriptions', 'session_id, apprenant:apprenant_id(id, prenom, nom)', 'session_id'),
    seq('qcm_reponses', 'session_id, qcm_id, apprenant_id, is_complete', 'session_id'),
  ])

  const qcmIds = [...new Set(liens.map((l: any) => l.qcm_id))]
  const { data: qcms } = qcmIds.length
    ? await supabase.from('qcm').select('id, type').in('id', qcmIds)
    : { data: [] as any[] }
  const typeQcm = new Map((qcms || []).map((q: any) => [q.id, q.type]))

  const { data: questions } = qcmIds.length
    ? await supabase.from('qcm_questions')
        .select('id, qcm_id, texte, type, position, choix:qcm_choix(id, texte, position)')
        .in('qcm_id', qcmIds).order('position', { ascending: true })
    : { data: [] as any[] }
  const questionsParQcm = new Map<string, any[]>()
  for (const q of questions || []) {
    if (!questionsParQcm.has((q as any).qcm_id)) questionsParQcm.set((q as any).qcm_id, [])
    questionsParQcm.get((q as any).qcm_id)!.push(q)
  }

  const faits = new Set((reponses || []).filter((r: any) => r.is_complete)
    .map((r: any) => `${r.session_id}|${r.qcm_id}|${r.apprenant_id}`))

  // Un questionnaire ne se remplit qu'à son heure : positionnement dès le
  // début de la session, acquis et satisfaction seulement une fois finie —
  // sinon les formateurs remplissent en avance et le dossier devient
  // incohérent.
  const aujourdHui = new Date().toISOString().slice(0, 10)
  const data = (sessions || []).map((s: any) => {
    const commencee = s.date_debut && String(s.date_debut).slice(0, 10) <= aujourdHui
    const finie = s.date_fin ? String(s.date_fin).slice(0, 10) < aujourdHui : commencee
    const inscrits = inscriptions.filter((i: any) => i.session_id === s.id).map((i: any) => i.apprenant).filter(Boolean)
    const grilles = liens.filter((l: any) => l.session_id === s.id).map((l: any) => {
      const type = typeQcm.get(l.qcm_id) as string
      if (['positionnement', 'entree'].includes(type) && !commencee) return null
      if (['sortie', 'satisfaction_chaud', 'satisfaction_froid'].includes(type) && !finie) return null
      const jalon = JALONS[type]
      const qs = questionsParQcm.get(l.qcm_id) || []
      if (!jalon || !qs.length) return null
      const enAttente = inscrits.filter((a: any) => !faits.has(`${s.id}|${l.qcm_id}|${a.id}`))
      if (!enAttente.length) return null
      return {
        qcmId: l.qcm_id,
        jalon,
        questions: qs.map((q: any) => ({
          id: q.id, texte: q.texte, type: q.type,
          choix: (q.choix || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
            .map((c: any) => ({ id: c.id, texte: c.texte })),
        })),
        stagiaires: enAttente.map((a: any) => ({ id: a.id, nom: `${a.prenom} ${a.nom}` })),
      }
    }).filter(Boolean)
    if (!grilles.length) return null
    return {
      id: s.id,
      ref: s.reference || s.id.slice(0, 8),
      debut: s.date_debut,
      client: s.client?.nom_commercial || s.client?.raison_sociale || '—',
      formation: s.formation?.intitule || s.intitule || '—',
      grilles,
    }
  }).filter(Boolean)

  return <GrillesClient formateur={(context as any).formateur} token={params.token} sessions={data as any[]} />
}
