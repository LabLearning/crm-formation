'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Send, GraduationCap, Award, Users, Check, Loader2, PenLine } from '@/components/ui/icons'
import { Button, Modal, Input, useToast } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { PoeiSection } from './PoeiSection'
import { sendAttestationsEntreeAction, sendGroupEmailToCandidatsAction, getPoeiEmailTemplatesAction } from '../actions'
import { sendCertificatSignatureAction, sendAllCertificatSignaturesAction } from '../certificat-signature-actions'

export interface CandidatMail {
  id: string
  nom: string
  email: string | null
  apprenantId: string | null
  attestationEnvoyeeLe?: string | null
  certificatEnvoyeLe?: string | null
  certificatSigneLe?: string | null
}

type TypeEnvoi = 'attestation' | 'certificat' | 'libre'

const TYPES: { cle: TypeEnvoi; titre: string; sous: string; icone: React.ElementType }[] = [
  { cle: 'attestation', titre: "Attestation d'entrée en formation", sous: 'À envoyer au démarrage du parcours', icone: GraduationCap },
  { cle: 'certificat', titre: 'Certificat de réalisation à signer', sous: 'Lien de signature envoyé en fin de parcours', icone: Award },
  { cle: 'libre', titre: 'Message libre', sous: 'Courrier personnalisé, avec ou sans pièce jointe', icone: PenLine },
]

/**
 * Centre d'envoi du dossier : les mails partaient jusqu'ici de l'onglet
 * Candidats, mélangés à la gestion des personnes. Ici on choisit un type
 * d'envoi, on choisit les destinataires, on envoie — et on voit ce qui est
 * déjà parti.
 */
export function PoeiMails({
  poeiId, candidats, historique,
}: {
  poeiId: string
  candidats: CandidatMail[]
  historique: React.ReactNode
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [type, setType] = useState<TypeEnvoi | null>(null)
  const [selection, setSelection] = useState<string[]>([])
  const [sujet, setSujet] = useState('')
  const [message, setMessage] = useState('')
  const [templates, setTemplates] = useState<{ slug: string; nom: string; sujet: string; corps_texte: string }[]>([])
  const [envoi, setEnvoi] = useState(false)

  const avecEmail = candidats.filter((c) => c.email)

  async function ouvrir(t: TypeEnvoi) {
    setType(t)
    setSelection(avecEmail.map((c) => c.id))
    if (t === 'libre') {
      setSujet('')
      setMessage('')
      const r = await getPoeiEmailTemplatesAction()
      if (r.success) setTemplates((r.data as any[]) || [])
    }
  }

  function basculer(id: string) {
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  async function envoyer() {
    if (selection.length === 0) { toast('error', 'Aucun destinataire sélectionné'); return }
    setEnvoi(true)
    let r: any
    if (type === 'attestation') {
      r = await sendAttestationsEntreeAction(poeiId, selection)
    } else if (type === 'certificat') {
      // Un lien de signature est propre à chaque candidat : envoi individuel.
      const cibles = candidats.filter((c) => selection.includes(c.id) && c.apprenantId)
      if (cibles.length === candidats.filter((c) => c.apprenantId).length) {
        r = await sendAllCertificatSignaturesAction(poeiId)
      } else {
        const res = await Promise.all(cibles.map((c) => sendCertificatSignatureAction(poeiId, c.apprenantId!)))
        const ok = res.filter((x: any) => x.success).length
        r = { success: ok > 0, data: { sent: ok }, error: ok === 0 ? 'Aucun envoi abouti' : undefined }
      }
    } else {
      if (!sujet.trim() || !message.trim()) { setEnvoi(false); toast('error', 'Sujet et message sont requis'); return }
      r = await sendGroupEmailToCandidatsAction(poeiId, selection, { subject: sujet, message })
    }
    setEnvoi(false)
    if (r?.success) {
      toast('success', `Envoi effectué${r.data?.sent ? ` — ${r.data.sent} destinataire(s)` : ''}`)
      setType(null)
      router.refresh()
    } else toast('error', r?.error || "L'envoi a échoué")
  }

  const etatPour = (c: CandidatMail, t: TypeEnvoi) => {
    if (t === 'attestation') return c.attestationEnvoyeeLe ? `Envoyée le ${formatDate(c.attestationEnvoyeeLe)}` : null
    if (t === 'certificat') {
      if (c.certificatSigneLe) return `Signé le ${formatDate(c.certificatSigneLe)}`
      if (c.certificatEnvoyeLe) return `Envoyé le ${formatDate(c.certificatEnvoyeLe)}`
    }
    return null
  }

  return (
    <PoeiSection
      icone={Mail}
      titre="Envois aux candidats"
      sous="Choisissez un type d'envoi, puis les destinataires."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TYPES.map((t) => {
          const Icone = t.icone
          const faits = t.cle === 'attestation'
            ? candidats.filter((c) => c.attestationEnvoyeeLe).length
            : t.cle === 'certificat'
              ? candidats.filter((c) => c.certificatEnvoyeLe || c.certificatSigneLe).length
              : null
          return (
            <button
              key={t.cle}
              onClick={() => ouvrir(t.cle)}
              disabled={avecEmail.length === 0}
              className="card p-4 text-left hover:border-surface-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start justify-between gap-2">
                <Icone className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                {faits !== null && (
                  <span className={cn(
                    'text-[11px] font-semibold px-1.5 py-0.5 rounded-full',
                    faits === candidats.length && candidats.length > 0 ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700',
                  )}>
                    {faits}/{candidats.length}
                  </span>
                )}
              </div>
              <div className="text-sm font-heading font-semibold text-surface-900 mt-2">{t.titre}</div>
              <div className="text-xs text-surface-500 mt-0.5">{t.sous}</div>
            </button>
          )
        })}
      </div>

      {avecEmail.length === 0 && candidats.length > 0 && (
        <div className="card p-4 border-warning-200 bg-warning-50/50 text-sm text-surface-700">
          Aucun candidat n&apos;a d&apos;adresse e-mail : complétez leurs fiches dans l&apos;onglet Candidats.
        </div>
      )}

      {historique}

      <Modal
        isOpen={!!type}
        onClose={() => setType(null)}
        title={TYPES.find((t) => t.cle === type)?.titre || 'Envoi'}
        size="lg"
      >
        <div className="space-y-4">
          {type === 'libre' && (
            <>
              {templates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => { setSujet(t.sujet); setMessage(t.corps_texte) }}
                      className="text-xs px-2.5 py-1 rounded-full border border-surface-200 text-surface-600 hover:border-brand-300 hover:text-brand-700"
                    >
                      {t.nom}
                    </button>
                  ))}
                </div>
              )}
              <Input id="sujet" label="Sujet" value={sujet} onChange={(e) => setSujet(e.target.value)} />
              <div>
                <label htmlFor="msg" className="block text-sm font-medium text-surface-700 mb-1.5">Message</label>
                <textarea id="msg" rows={7} value={message} onChange={(e) => setMessage(e.target.value)} className="input-base w-full resize-none" />
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="section-label">Destinataires ({selection.length}/{avecEmail.length})</span>
              <button
                type="button"
                onClick={() => setSelection(selection.length === avecEmail.length ? [] : avecEmail.map((c) => c.id))}
                className="text-xs text-brand-600 hover:underline"
              >
                {selection.length === avecEmail.length ? 'Tout décocher' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="rounded-xl border border-surface-200 divide-y divide-surface-100 max-h-64 overflow-y-auto">
              {candidats.map((c) => {
                const etat = type ? etatPour(c, type) : null
                return (
                  <label
                    key={c.id}
                    className={cn('flex items-center gap-3 px-3 py-2', !c.email && 'opacity-50 cursor-not-allowed')}
                  >
                    <input
                      type="checkbox"
                      checked={selection.includes(c.id)}
                      disabled={!c.email}
                      onChange={() => basculer(c.id)}
                      className="h-4 w-4 rounded border-surface-300 text-brand-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-surface-800 truncate">{c.nom}</span>
                      <span className="block text-xs text-surface-500 truncate">{c.email || 'Pas d’adresse e-mail'}</span>
                    </span>
                    {etat && (
                      <span className="text-[11px] text-success-600 shrink-0 inline-flex items-center gap-1">
                        <Check className="h-3 w-3" />{etat}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setType(null)}>Annuler</Button>
            <Button onClick={envoyer} isLoading={envoi} icon={<Send className="h-4 w-4" />}>
              Envoyer à {selection.length} candidat{selection.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </PoeiSection>
  )
}
