'use client'

import { useState } from 'react'
import { Camera, CheckCircle2, ClipboardList, Loader2, Printer, Save } from 'lucide-react'
import { lireFichesAction } from './lecture-actions'
import { enregistrerGrillePortailAction } from './actions'

interface Question { id: string; texte: string; type: string; choix: { id: string; texte: string }[] }
interface Grille { qcmId: string; jalon: string; questions: Question[]; stagiaires: { id: string; nom: string }[] }
interface SessionG { id: string; ref: string; debut: string | null; client: string; formation: string; grilles: Grille[] }

const LETTRES = 'ABCDEFGHIJ'

/**
 * Grilles remplissables : questions en lignes, stagiaires en colonnes.
 * « Enregistrer » écrit les réponses dans le CRM (score calculé) — les
 * colonnes enregistrées passent en vert. Imprimable pour le circuit papier.
 */
export function GrillesClient({ formateur, token, sessions }: {
  formateur: any
  token: string
  sessions: SessionG[]
}) {
  // valeurs[qcmId|sessionId][apprenantId][questionId] = choix_id | note | texte
  const [valeurs, setValeurs] = useState<Record<string, Record<string, Record<string, string>>>>({})
  const [enregistres, setEnregistres] = useState<Record<string, string[]>>({})
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const cle = (s: SessionG, g: Grille) => `${g.qcmId}|${s.id}`
  const poser = (k: string, apprenantId: string, questionId: string, v: string) =>
    setValeurs((x) => ({ ...x, [k]: { ...(x[k] || {}), [apprenantId]: { ...((x[k] || {})[apprenantId] || {}), [questionId]: v } } }))

  const [lecture, setLecture] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<Record<string, Set<string>>>({})

  /** Compresse une photo de téléphone en JPEG ~1600px pour l'action serveur. */
  function compresser(fichier: File): Promise<{ base64: string; mediaType: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const max = 1600
        const ratio = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * ratio); c.height = Math.round(img.height * ratio)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        const url = c.toDataURL('image/jpeg', 0.8)
        resolve({ base64: url.split(',')[1], mediaType: 'image/jpeg' })
      }
      img.onerror = reject
      img.src = URL.createObjectURL(fichier)
    })
  }

  async function lirePhotos(s: SessionG, g: Grille, fichiers: FileList | null) {
    if (!fichiers?.length) return
    const k = cle(s, g)
    setErreur(null)
    setLecture(k)
    try {
      const images = await Promise.all([...fichiers].slice(0, 6).map(compresser))
      const r = await lireFichesAction(token, s.id, g.qcmId, images)
      if (r.success && r.resultats) {
        const touches = new Set(prefill[k] || [])
        setValeurs((x) => {
          const bloc = { ...(x[k] || {}) }
          for (const [apprenantId, reponses] of Object.entries(r.resultats!)) {
            bloc[apprenantId] = { ...(bloc[apprenantId] || {}), ...reponses }
            for (const qId of Object.keys(reponses)) touches.add(`${apprenantId}|${qId}`)
          }
          return { ...x, [k]: bloc }
        })
        setPrefill((x) => ({ ...x, [k]: touches }))
        if (r.nonReconnus?.length) setErreur(`Fiches lues, sauf : ${r.nonReconnus.join(' ; ').slice(0, 180)}`)
      } else setErreur(r.error || 'Lecture impossible')
    } catch {
      setErreur('Lecture impossible — réessayez.')
    }
    setLecture(null)
  }

  async function enregistrer(s: SessionG, g: Grille) {
    const k = cle(s, g)
    setErreur(null)
    setEnCours(k)
    const r = await enregistrerGrillePortailAction(token, s.id, g.qcmId, valeurs[k] || {})
    setEnCours(null)
    if (r.success) setEnregistres((x) => ({ ...x, [k]: [...(x[k] || []), ...(r.faits || [])] }))
    else setErreur(r.error || 'Erreur lors de l’enregistrement')
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 rounded-full px-3 py-1 mb-2">
              <ClipboardList className="h-3.5 w-3.5" /> Grilles de saisie
            </div>
            <h1 className="text-xl font-heading font-bold text-surface-900">
              {formateur?.prenom} {formateur?.nom} — questionnaires à compléter
            </h1>
            <p className="text-sm text-surface-500 mt-1 max-w-2xl">
              Remplissez les réponses de vos stagiaires (depuis vos feuilles papier) puis Enregistrer :
              tout part directement dans le CRM. Seuls les stagiaires non encore saisis apparaissent.
            </p>
          </div>
          <button onClick={() => window.print()} className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm print:hidden">
            <Printer className="h-4 w-4" /> Imprimer (version papier)
          </button>
        </div>

        {erreur && <div className="mb-4 rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700">{erreur}</div>}

        {sessions.length === 0 && (
          <div className="card p-10 text-center text-sm text-surface-500">
            Tout est à jour — aucun questionnaire en attente sur vos sessions.
          </div>
        )}

        {sessions.map((s) => (
          <div key={s.id} className="mb-8 break-before-page">
            <div className="mb-2">
              <div className="font-heading font-bold text-surface-900">{s.ref} · {s.client}</div>
              <div className="text-xs text-surface-500">{s.formation}{s.debut ? ` — ${new Date(s.debut).toLocaleDateString('fr-FR')}` : ''}</div>
            </div>

            {s.grilles.map((g) => {
              const k = cle(s, g)
              const dejaFaits = new Set(enregistres[k] || [])
              const restants = g.stagiaires.filter((st) => !dejaFaits.has(st.id))
              return (
                <div key={k} className="card overflow-hidden mb-4 break-inside-avoid">
                  <div className="px-4 py-2.5 border-b border-surface-100 flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-surface-900">{g.jalon}</span>
                    {restants.length > 0 ? (
                      <>
                      <label className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs cursor-pointer print:hidden">
                        {lecture === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                        {lecture === k ? 'Lecture en cours…' : 'Lire des photos de fiches'}
                        <input type="file" accept="image/*" multiple className="hidden"
                          disabled={lecture === k}
                          onChange={(e) => { lirePhotos(s, g, e.target.files); e.target.value = '' }} />
                      </label>
                      <button onClick={() => enregistrer(s, g)} disabled={enCours === k}
                        className="btn-primary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs disabled:opacity-60 print:hidden">
                        {enCours === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Enregistrer les réponses
                      </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Tout est enregistré
                      </span>
                    )}
                  </div>
                  {restants.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{ minWidth: 560 }}>
                        <thead>
                          <tr className="border-b border-surface-100 bg-surface-50/60">
                            <th className="text-left px-3 py-2 font-semibold text-surface-500 uppercase tracking-wider text-[10px]">Question</th>
                            {restants.map((st) => (
                              <th key={st.id} className="px-2 py-2 font-semibold text-surface-600 text-[10px] max-w-[120px] border-l border-surface-100">{st.nom}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                          {g.questions.map((q, i) => {
                            const estChoix = q.choix.length > 0
                            const estTexte = q.type === 'texte_libre'
                            const plafond = q.type === 'note_1_10' || q.type === 'nps' ? 10 : 5
                            return (
                              <tr key={q.id}>
                                <td className="px-3 py-2 align-top max-w-[340px]">
                                  <div className="font-medium text-surface-900">{i + 1}. {q.texte}</div>
                                  {estChoix && (
                                    <div className="text-surface-500 mt-0.5">
                                      {q.choix.map((c, j) => <span key={c.id} className="mr-2"><b>{LETTRES[j]})</b> {c.texte}</span>)}
                                    </div>
                                  )}
                                </td>
                                {restants.map((st) => {
                                  const v = valeurs[k]?.[st.id]?.[q.id] || ''
                                  const luParIa = prefill[k]?.has(`${st.id}|${q.id}`)
                                  return (
                                    <td key={st.id} className={`px-2 py-1.5 align-top border-l border-surface-100 min-w-[86px] ${luParIa ? 'bg-amber-50/70' : ''}`}>
                                      {estChoix ? (
                                        <select value={v} onChange={(e) => poser(k, st.id, q.id, e.target.value)}
                                          className="input-base !py-1 !px-1.5 text-xs w-full">
                                          <option value="">—</option>
                                          {q.choix.map((c, j) => <option key={c.id} value={c.id}>{LETTRES[j]}</option>)}
                                        </select>
                                      ) : estTexte ? (
                                        <textarea value={v} onChange={(e) => poser(k, st.id, q.id, e.target.value)}
                                          rows={2} className="input-base !py-1 !px-1.5 text-xs w-full font-normal" />
                                      ) : (
                                        <select value={v} onChange={(e) => poser(k, st.id, q.id, e.target.value)}
                                          className="input-base !py-1 !px-1.5 text-xs w-full">
                                          <option value="">—</option>
                                          {Array.from({ length: plafond }, (_, n) => n + 1).map((n) => (
                                            <option key={n} value={String(n)}>{n}</option>
                                          ))}
                                        </select>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
