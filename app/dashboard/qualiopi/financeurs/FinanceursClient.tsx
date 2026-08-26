'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, CheckCircle2, Copy, Eye, Loader2, Send, Star } from '@/components/ui/icons'
import { Button, Modal, BackLink, useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { envoyerQuestionnaireFinanceurAction } from './actions'

const FINANCEURS = ['AKTO', 'France Travail', 'OPCO EP', 'Opcommerce']

/** Sollicitation annuelle des financeurs : un envoi tracé par financeur,
 *  aperçu avant envoi, réponses reçues en dessous. */
export function FinanceursClient({ reponses, envois, lienPublic }: {
  reponses: any[]
  envois: any[]
  lienPublic: string
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [emails, setEmails] = useState<Record<string, string>>({})
  const [enCours, setEnCours] = useState<string | null>(null)
  const [apercu, setApercu] = useState<{ financeur: string; email: string; html: string; subject?: string } | null>(null)

  async function ouvrirApercu(financeur: string) {
    const email = (emails[financeur] || '').trim()
    if (!email) { toast('error', "Renseignez l'email du contact " + financeur); return }
    setEnCours(financeur)
    const r = await envoyerQuestionnaireFinanceurAction(financeur, email, { preview: true })
    setEnCours(null)
    if (r.success && r.data?.html) setApercu({ financeur, email, html: r.data.html, subject: r.data.subject })
    else toast('error', r.error || 'Erreur')
  }

  async function confirmer() {
    if (!apercu) return
    setEnCours(apercu.financeur)
    const r = await envoyerQuestionnaireFinanceurAction(apercu.financeur, apercu.email)
    setEnCours(null)
    if (r.success) { toast('success', `Questionnaire envoyé à ${apercu.email}`); setApercu(null); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div>
        <BackLink fallbackHref="/dashboard/qualiopi" label="Qualiopi" />
        <h1 className="text-xl font-heading font-bold text-surface-900 flex items-center gap-2 mt-1">
          <Banknote className="h-5 w-5 text-brand-500" /> Appréciations des financeurs
        </h1>
        <p className="text-sm text-surface-500 mt-1">
          Sollicitation annuelle (indicateur 30) : le financeur note la qualité des dossiers, la réactivité
          et la collaboration — quatre questions, deux minutes, sans compte.
        </p>
      </div>

      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-surface-600">Lien du questionnaire :</span>
        <code className="text-xs bg-surface-50 border border-surface-100 rounded-lg px-2.5 py-1.5 flex-1 min-w-0 truncate">{lienPublic}</code>
        <button onClick={() => { navigator.clipboard.writeText(lienPublic); toast('success', 'Lien copié') }}
          className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-xs">
          <Copy className="h-3.5 w-3.5" /> Copier
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 text-xs font-semibold text-surface-500 uppercase tracking-wider">
          Envoyer le questionnaire
        </div>
        <div className="divide-y divide-surface-100">
          {FINANCEURS.map((f) => {
            const dernierEnvoi = envois.find((e) => (e.subject || '').includes('organisme de formation'))
              ? envois.filter((e) => true).find((e) => e.to_email && (emails[f] ? e.to_email === emails[f] : false))
              : null
            return (
              <div key={f} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-surface-900 w-32 shrink-0">{f}</span>
                <input
                  value={emails[f] || ''}
                  onChange={(e) => setEmails((x) => ({ ...x, [f]: e.target.value }))}
                  placeholder={`Email du contact ${f}…`}
                  className="input-base !py-1.5 text-sm flex-1 min-w-[220px]"
                />
                <button onClick={() => ouvrirApercu(f)} disabled={enCours === f}
                  className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm disabled:opacity-60">
                  {enCours === f && !apercu ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Aperçu et envoi
                </button>
                {dernierEnvoi && (
                  <span className="text-xs text-emerald-700">Envoyé le {formatDate(dernierEnvoi.sent_at || dernierEnvoi.created_at, { day: 'numeric', month: 'short' })}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {envois.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 text-xs font-semibold text-surface-500 uppercase tracking-wider">
            Historique des envois
          </div>
          <div className="divide-y divide-surface-50">
            {envois.map((e, i) => (
              <div key={i} className="px-4 py-2 flex items-center gap-3 text-sm">
                <span className="text-surface-900">{e.to_email}</span>
                <span className="text-xs text-surface-400 ml-auto">{formatDate(e.sent_at || e.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className={`text-2xs px-2 py-0.5 rounded-full ${e.status === 'sent' || e.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 text-xs font-semibold text-surface-500 uppercase tracking-wider">
          Réponses reçues ({reponses.length})
        </div>
        {reponses.length === 0 ? (
          <div className="p-8 text-center text-sm text-surface-400">Aucune réponse pour l&apos;instant.</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {reponses.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-surface-900">
                    <Star className="h-4 w-4 text-amber-400" /> {r.note_globale}/5
                  </span>
                  {r.repondant_nom && <span className="text-sm text-surface-600">{r.repondant_nom}{r.repondant_fonction ? ` — ${r.repondant_fonction}` : ''}</span>}
                  {r.recommande != null && (
                    <span className={`text-2xs px-2 py-0.5 rounded-full ${r.recommande ? 'bg-emerald-50 text-emerald-700' : 'bg-danger-50 text-danger-700'}`}>
                      {r.recommande ? 'Répond aux attentes' : 'Ne répond pas aux attentes'}
                    </span>
                  )}
                  <span className="text-xs text-surface-400 ml-auto">{formatDate(r.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                {r.commentaire && <p className="text-sm text-surface-600 mt-1.5">{r.commentaire}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!apercu} onClose={() => setApercu(null)} size="lg" title={`Aperçu — questionnaire ${apercu?.financeur || ''}`}>
        {apercu && (
          <div className="space-y-3">
            <div className="text-xs text-surface-500">
              <div><span className="font-semibold text-surface-700">À :</span> {apercu.email}</div>
              <div><span className="font-semibold text-surface-700">Objet :</span> {apercu.subject}</div>
            </div>
            <div className="rounded-xl border border-surface-200 overflow-hidden bg-white">
              <iframe title="Aperçu email" srcDoc={apercu.html} className="w-full" style={{ height: 440, border: 0 }} />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setApercu(null)}>Annuler</Button>
              <Button onClick={confirmer} isLoading={enCours === apercu.financeur} icon={<Send className="h-4 w-4" />}>
                Confirmer l&apos;envoi
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
