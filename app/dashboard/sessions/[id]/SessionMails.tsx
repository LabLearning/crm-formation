'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, GraduationCap, Users, UserCheck, CheckCircle2, Clock, XCircle, Send, Loader2, Eye } from 'lucide-react'
import { Modal, Button, useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { sendSessionInfoToFormateurAction, sendConvocationToReferentAction } from './actions'

interface EmailLog {
  id: string; to_email: string; to_name: string | null; subject: string
  status: string | null; sent_at: string | null; created_at: string
}
interface Person { id?: string; nom: string; email: string | null; sub?: string | null }

const norm = (e?: string | null) => (e || '').trim().toLowerCase()

function StatusPill({ status }: { status: string | null }) {
  const s = status || 'pending'
  if (s === 'sent') return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Envoyé</span>
  if (s === 'failed') return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger-600"><XCircle className="h-3 w-3" /> Échec</span>
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600"><Clock className="h-3 w-3" /> En cours</span>
}

/**
 * Mails de la session : trace des emails envoyés (email_logs) regroupés par
 * destinataire — apprenants, référent client, formateur — et actions d'envoi.
 */
export function SessionMails({
  sessionId, formateur, apprenants, contacts, emailLogs,
}: {
  sessionId: string
  formateur: { prenom?: string; nom?: string; email?: string | null } | null
  apprenants: Person[]
  contacts: { prenom?: string; nom?: string; poste?: string | null; email: string | null }[]
  emailLogs: EmailLog[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [tab, setTab] = useState<'apprenants' | 'referent' | 'formateur'>('apprenants')
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<{ html: string; subject?: string; to?: string } | null>(null)
  const [previewKind, setPreviewKind] = useState<'formateur' | 'convocation'>('formateur')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const logsFor = (email?: string | null) => emailLogs.filter((l) => norm(l.to_email) === norm(email)).slice(0, 12)

  // Aperçu avant envoi : récupère le HTML de l'email sans l'envoyer
  async function openPreview(kind: 'formateur' | 'convocation') {
    setPreviewLoading(true)
    const fn = kind === 'convocation' ? sendConvocationToReferentAction : sendSessionInfoToFormateurAction
    const r = await fn(sessionId, { preview: true })
    setPreviewLoading(false)
    if ((r as any)?.success && (r as any).data?.html) {
      setPreviewKind(kind)
      setPreview({ html: (r as any).data.html, subject: (r as any).data.subject, to: (r as any).data.email })
    } else {
      toast('error', (r as any)?.error || "Impossible de générer l'aperçu")
    }
  }

  function confirmSend() {
    setSending(true)
    startTransition(async () => {
      const fn = previewKind === 'convocation' ? sendConvocationToReferentAction : sendSessionInfoToFormateurAction
      const r = await fn(sessionId)
      setSending(false)
      if ((r as any)?.success) {
        toast('success', previewKind === 'convocation' ? `Convocation envoyée à ${(r as any).data?.email || 'au référent'}` : `Infos envoyées à ${(r as any).data?.email || 'au formateur'}`)
        setPreview(null); router.refresh()
      } else toast('error', (r as any)?.error || 'Erreur')
    })
  }

  const referents: Person[] = contacts.map((c) => ({
    nom: `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Contact',
    email: c.email, sub: c.poste || null,
  }))
  const formateurPerson: Person | null = formateur
    ? { nom: `${formateur.prenom || ''} ${formateur.nom || ''}`.trim(), email: formateur.email || null }
    : null

  const tabs = [
    { id: 'apprenants' as const, label: 'Apprenants', icon: Users, count: apprenants.length },
    { id: 'referent' as const, label: 'Référent', icon: UserCheck, count: referents.length },
    { id: 'formateur' as const, label: 'Formateur', icon: GraduationCap, count: formateurPerson ? 1 : 0 },
  ]

  function PersonRow({ p, action }: { p: Person; action?: React.ReactNode }) {
    const logs = logsFor(p.email)
    return (
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-surface-900 truncate">{p.nom}{p.sub ? <span className="text-surface-400 font-normal"> · {p.sub}</span> : null}</div>
            <div className="text-xs text-surface-500 truncate">{p.email || <span className="text-surface-300">Pas d’email</span>}</div>
          </div>
          {action}
        </div>
        {logs.length > 0 && (
          <div className="mt-2 rounded-lg border border-surface-100 divide-y divide-surface-100">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <span className="text-xs text-surface-700 truncate">{l.subject}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <StatusPill status={l.status} />
                  <span className="text-[11px] text-surface-400">{formatDate(l.sent_at || l.created_at, { day: 'numeric', month: 'short' })}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
        <Mail className="h-4 w-4 text-brand-500" />
        <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Mails de la session</span>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 px-3 pt-2 border-b border-surface-100">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${active ? 'border-surface-900 text-surface-900' : 'border-transparent text-surface-500 hover:text-surface-700'}`}>
              <Icon className="h-4 w-4" /> {t.label}
              {t.count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${active ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-500'}`}>{t.count}</span>}
            </button>
          )
        })}
      </div>

      <div className="divide-y divide-surface-100">
        {tab === 'apprenants' && (
          apprenants.length === 0
            ? <div className="text-center py-8 text-sm text-surface-400">Aucun apprenant inscrit</div>
            : apprenants.map((p, i) => <PersonRow key={p.id || i} p={p} />)
        )}
        {tab === 'referent' && (
          referents.length === 0
            ? <div className="text-center py-8 text-sm text-surface-400">Aucun contact référent sur le client</div>
            : <>
                <div className="px-4 pt-3">
                  <button onClick={() => openPreview('convocation')} disabled={previewLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">
                    {previewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Convocation (participants + PDF) — aperçu & envoi
                  </button>
                  <p className="text-[11px] text-surface-400 mt-1">Envoyée au contact signataire / principal de l'établissement, avec la convocation PDF listant les participants.</p>
                </div>
                {referents.map((p, i) => <PersonRow key={i} p={p} />)}
              </>
        )}
        {tab === 'formateur' && (
          !formateurPerson
            ? <div className="text-center py-8 text-sm text-surface-400">Aucun formateur rattaché</div>
            : <PersonRow p={formateurPerson} action={
                formateurPerson.email ? (
                  <button onClick={() => openPreview('formateur')} disabled={previewLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-900 text-white text-xs font-medium hover:bg-surface-800 disabled:opacity-50 transition-colors shrink-0">
                    {previewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Aperçu & envoi
                  </button>
                ) : undefined
              } />
        )}
      </div>

      <div className="px-4 py-2 bg-surface-50/60 text-[11px] text-surface-500">
        Chaque email envoyé depuis le CRM (convocations, attestations, infos formateur…) est tracé ici, par destinataire.
      </div>

      {/* Aperçu de l'email avant envoi */}
      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title="Aperçu de l'email" size="lg">
        {preview && (
          <div className="space-y-3">
            <div className="text-xs text-surface-500">
              <div><span className="font-semibold text-surface-700">À :</span> {preview.to}</div>
              <div><span className="font-semibold text-surface-700">Objet :</span> {preview.subject}</div>
            </div>
            <div className="rounded-xl border border-surface-200 overflow-hidden bg-white">
              <iframe title="Aperçu email" srcDoc={preview.html} className="w-full" style={{ height: 460, border: 0 }} />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setPreview(null)}>Annuler</Button>
              <Button onClick={confirmSend} isLoading={sending || pending} icon={<Send className="h-4 w-4" />}>Confirmer l'envoi</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
