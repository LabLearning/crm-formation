'use server'

import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Lecture IA des fiches papier : le formateur photographie les questionnaires
 * remplis, Claude lit le nom du stagiaire et les réponses, et la grille se
 * préremplit — le formateur VÉRIFIE puis enregistre. L'IA propose, l'humain
 * valide : rien ne s'écrit en base ici.
 */
export async function lireFichesAction(
  token: string,
  sessionId: string,
  qcmId: string,
  images: { base64: string; mediaType: string }[],
): Promise<{ success: boolean; error?: string; resultats?: Record<string, Record<string, string>>; nonReconnus?: string[] }> {
  const context = await getPortalContext(token)
  if (!context || context.type !== 'formateur') return { success: false, error: 'Accès non autorisé' }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "Lecture IA non configurée (clé API manquante) — remplissez la grille à la main." }
  }
  if (!images.length || images.length > 6) return { success: false, error: '1 à 6 photos par lecture.' }

  const supabase = await createServiceRoleClient()
  const { data: sess } = await supabase.from('sessions')
    .select('id').eq('id', sessionId).eq('formateur_id', (context as any).formateur.id).maybeSingle()
  if (!sess) return { success: false, error: 'Session introuvable' }

  // Structure du questionnaire + stagiaires attendus.
  const [{ data: questions }, { data: inscrits }] = await Promise.all([
    supabase.from('qcm_questions')
      .select('id, texte, type, position, choix:qcm_choix(id, texte, position)')
      .eq('qcm_id', qcmId).order('position', { ascending: true }),
    supabase.from('inscriptions')
      .select('apprenant:apprenant_id(id, prenom, nom)').eq('session_id', sessionId),
  ])
  if (!questions?.length) return { success: false, error: 'Questionnaire sans questions' }

  const LETTRES = 'ABCDEFGHIJ'
  const stagiaires = (inscrits || []).map((i: any) => i.apprenant).filter(Boolean)
  const descQuestions = (questions as any[]).map((q, i) => {
    if ((q.choix || []).length) {
      const opts = (q.choix as any[]).sort((a, b) => (a.position || 0) - (b.position || 0))
        .map((c, j) => `${LETTRES[j]}) ${c.texte}`).join(' | ')
      return `${i + 1}. [choix] ${q.texte} — options : ${opts}`
    }
    if (q.type === 'texte_libre') return `${i + 1}. [texte libre] ${q.texte}`
    const plafond = q.type === 'note_1_10' || q.type === 'nps' ? 10 : 5
    return `${i + 1}. [note 1-${plafond}] ${q.texte}`
  }).join('\n')

  const prompt = `Voici ${images.length} photo(s) de questionnaires de formation remplis à la main.

Le questionnaire comporte ces questions :
${descQuestions}

Les stagiaires possibles (nom exact à rapprocher de ce qui est écrit sur la fiche) :
${stagiaires.map((s: any) => `- ${s.prenom} ${s.nom}`).join('\n')}

Pour CHAQUE fiche lisible, identifie le stagiaire et ses réponses. Réponds UNIQUEMENT avec un JSON de cette forme, sans autre texte :
{"fiches":[{"stagiaire":"Prénom Nom (exactement comme dans la liste)","reponses":{"1":"B","2":"4","3":"texte recopié"}}],"non_reconnus":["description des fiches illisibles ou stagiaires hors liste"]}

Règles : pour une question [choix], donne la LETTRE cochée (ou "" si rien de coché). Pour une [note], le chiffre entouré/coché. Pour un [texte libre], recopie le texte manuscrit tel quel. Ne devine jamais : en cas de doute sur une réponse, mets "".`

  const contenu: any[] = [{ type: 'text', text: prompt }]
  for (const img of images) {
    contenu.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } })
  }

  let brut = ''
  try {
    const rep = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: contenu }],
      }),
    })
    if (!rep.ok) {
      const detail = await rep.text()
      console.error('[lecture fiches]', rep.status, detail.slice(0, 300))
      return { success: false, error: rep.status === 401 ? 'Clé API invalide' : 'La lecture a échoué — réessayez ou remplissez à la main.' }
    }
    const json = await rep.json()
    brut = (json.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  } catch (e) {
    console.error('[lecture fiches]', e)
    return { success: false, error: 'La lecture a échoué — réessayez ou remplissez à la main.' }
  }

  let extrait: any
  try {
    extrait = JSON.parse(brut.slice(brut.indexOf('{'), brut.lastIndexOf('}') + 1))
  } catch {
    return { success: false, error: "Lecture illisible — réessayez avec une photo plus nette." }
  }

  // Lettres -> ids de choix, rapprochement des noms.
  const norm = (s: string) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim()
  const parNom = new Map(stagiaires.map((s: any) => [norm(`${s.prenom} ${s.nom}`), s.id]))
  const resultats: Record<string, Record<string, string>> = {}
  const nonReconnus: string[] = [...(extrait.non_reconnus || [])]

  for (const fiche of extrait.fiches || []) {
    const apprenantId = parNom.get(norm(String(fiche.stagiaire || '')))
      || [...parNom.entries()].find(([n]) => n.includes(norm(String(fiche.stagiaire || ''))) || norm(String(fiche.stagiaire || '')).includes(n))?.[1]
    if (!apprenantId) { nonReconnus.push(String(fiche.stagiaire || 'fiche sans nom')); continue }
    const reponses: Record<string, string> = {}
    ;(questions as any[]).forEach((q, i) => {
      const v = String(fiche.reponses?.[String(i + 1)] ?? '').trim()
      if (!v) return
      if ((q.choix || []).length) {
        const idx = LETTRES.indexOf(v.toUpperCase().charAt(0))
        const choix = (q.choix as any[]).sort((a, b) => (a.position || 0) - (b.position || 0))[idx]
        if (choix) reponses[q.id] = choix.id
      } else if (q.type === 'texte_libre') {
        reponses[q.id] = v
      } else {
        const n = parseInt(v, 10)
        if (!Number.isNaN(n)) reponses[q.id] = String(n)
      }
    })
    if (Object.keys(reponses).length) resultats[apprenantId] = reponses
  }

  if (!Object.keys(resultats).length) {
    return { success: false, error: nonReconnus.length ? `Aucune fiche rapprochée (${nonReconnus.join(' ; ').slice(0, 150)})` : 'Aucune réponse lue sur ces photos.' }
  }
  return { success: true, resultats, nonReconnus }
}
