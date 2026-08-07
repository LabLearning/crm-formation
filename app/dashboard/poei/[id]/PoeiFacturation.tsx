'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Download, FileText, Award, Clock, Building2, Plus, PenLine, CheckCircle2, Send } from 'lucide-react'
import { Button, useToast, Modal, Input } from '@/components/ui'
import { generateFacturesPerCandidatPoeiAction, setPoeiAgenceFtAction, createAgenceFtAction, setPoeiNumeroEngagementAction, setCandidatNumeroEngagementAction } from '../actions'
import { sendCertificatSignatureAction, sendAllCertificatSignaturesAction } from '../certificat-signature-actions'

interface Candidat {
  id: string
  numero_engagement?: string | null
  apprenant?: { id: string; prenom: string | null; nom: string | null } | null
}
interface FactureInfo { id: string; numero: string | null; status: string; montant_ttc: number | null }

const FACT_STATUS: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-surface-100 text-surface-600' },
  emise: { label: 'Émise', cls: 'bg-blue-100 text-blue-700' },
  envoyee: { label: 'Envoyée', cls: 'bg-indigo-100 text-indigo-700' },
  payee_partiellement: { label: 'Payée en partie', cls: 'bg-amber-100 text-amber-700' },
  payee: { label: 'Payée', cls: 'bg-emerald-100 text-emerald-700' },
  en_retard: { label: 'En retard', cls: 'bg-rose-100 text-rose-700' },
  annulee: { label: 'Annulée', cls: 'bg-surface-100 text-surface-400' },
}

interface Agence { id: string; nom: string; ville?: string | null }

/** N° d'engagement France Travail d'un candidat, saisi puis reporté sur sa facture. */
function EngagementCandidat({ candidatId, valeur, verrouille }: { candidatId: string; valeur: string; verrouille: boolean }) {
  const { toast } = useToast()
  const router = useRouter()
  const [v, setV] = useState(valeur)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (v.trim() === valeur.trim()) return
    setBusy(true)
    const r = await setCandidatNumeroEngagementAction(candidatId, v)
    setBusy(false)
    if (r.success) { toast('success', 'N° d’engagement enregistré'); router.refresh() }
    else { toast('error', r.error || 'Erreur'); setV(valeur) }
  }

  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={save}
      disabled={verrouille || busy}
      placeholder="N° engagement"
      title={verrouille ? 'Facture déjà émise : numéro figé' : 'N° d’engagement France Travail de ce candidat'}
      className={`input-base !py-1 !px-2 text-xs font-mono w-36 ${!v ? 'border-amber-300 bg-amber-50/40' : ''} disabled:opacity-60`}
    />
  )
}

export function PoeiFacturation({
  poeiId, sessionId, sessionTerminee, candidats, facturesByCandidat, agences = [], currentAgenceId = null,
  signatures = {}, numeroEngagement = null,
}: {
  poeiId: string
  sessionId: string | null
  sessionTerminee: boolean
  candidats: Candidat[]
  signatures?: Record<string, { signed_at: string | null; sent_at: string | null }>
  facturesByCandidat: Record<string, FactureInfo>
  agences?: Agence[]
  currentAgenceId?: string | null
  numeroEngagement?: string | null
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [gen, setGen] = useState(false)
  const [agenceId, setAgenceId] = useState(currentAgenceId || '')
  const [createOpen, setCreateOpen] = useState(false)
  const [savingAg, setSavingAg] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [sendingAll, setSendingAll] = useState(false)
  const [engagement, setEngagement] = useState(numeroEngagement || '')
  const [savingEng, setSavingEng] = useState(false)

  async function saveEngagement() {
    if (engagement.trim() === (numeroEngagement || '')) return
    setSavingEng(true)
    const r = await setPoeiNumeroEngagementAction(poeiId, engagement)
    setSavingEng(false)
    if (r.success) {
      const n = (r.data as any)?.factures_mises_a_jour || 0
      toast('success', n ? `Numéro d'engagement enregistré · ${n} facture(s) mise(s) à jour` : "Numéro d'engagement enregistré")
      router.refresh()
    } else toast('error', r.error || 'Erreur')
  }

  async function sendSignature(apprenantId: string) {
    setSending(apprenantId)
    const r = await sendCertificatSignatureAction(poeiId, apprenantId)
    if (r.success) { toast('success', `Lien de signature envoyé à ${r.data?.email || 'le candidat'}`); router.refresh() }
    else toast('error', r.error || 'Erreur')
    setSending(null)
  }

  async function sendAllSignatures() {
    setSendingAll(true)
    const r = await sendAllCertificatSignaturesAction(poeiId)
    if (r.success) { toast('success', `${r.data?.sent || 0} lien(s) envoyé(s)${r.data?.skipped ? ` · ${r.data.skipped} ignoré(s)` : ''}`); router.refresh() }
    else toast('error', r.error || 'Erreur')
    setSendingAll(false)
  }

  async function chooseAgence(id: string) {
    setAgenceId(id)
    const r = await setPoeiAgenceFtAction(poeiId, id || null)
    if (r.success) { toast('success', 'Agence rattachée'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  async function createAgence(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSavingAg(true)
    const fd = new FormData(e.currentTarget)
    const r = await createAgenceFtAction(fd)
    if (r.success && (r.data as any)?.id) {
      await setPoeiAgenceFtAction(poeiId, (r.data as any).id)
      toast('success', 'Agence créée et rattachée')
      setCreateOpen(false)
      router.refresh()
    } else toast('error', r.error || 'Erreur')
    setSavingAg(false)
  }

  async function generate() {
    setGen(true)
    const r = await generateFacturesPerCandidatPoeiAction(poeiId)
    setGen(false)
    if (r.success) {
      const { created, updated, skipped, supprimees, orphelinesEmises } = (r.data || {}) as
        { created: number; updated: number; skipped: number; supprimees?: number; orphelinesEmises?: number }
      const parts: string[] = []
      if (created) parts.push(`${created} générée${created > 1 ? 's' : ''}`)
      if (updated) parts.push(`${updated} mise${updated > 1 ? 's' : ''} à jour`)
      if (skipped) parts.push(`${skipped} déjà émise${skipped > 1 ? 's' : ''}`)
      if (supprimees) parts.push(`${supprimees} supprimée${supprimees > 1 ? 's' : ''} (candidat retiré)`)
      if (orphelinesEmises) {
        toast('error', `${orphelinesEmises} facture(s) émise(s) concernent un candidat retiré du dossier — à annuler manuellement`)
      }
      toast('success', parts.length ? `Factures : ${parts.join(', ')}` : 'Aucune facture modifiée')
      router.refresh()
    } else toast('error', r.error || 'Erreur')
  }

  const nbFactures = Object.keys(facturesByCandidat).length

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-heading font-semibold text-surface-900">Facturation & documents de clôture</span>
        </div>
        {sessionTerminee && (
          <div className="flex items-center gap-2">
            <Button onClick={generate} isLoading={gen} size="sm" icon={<Receipt className="h-4 w-4" />}>
              {nbFactures > 0 ? 'Mettre à jour les factures' : 'Générer les factures'}
            </Button>
            <button onClick={sendAllSignatures} disabled={sendingAll}
              className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm disabled:opacity-50">
              <Send className="h-4 w-4" /> {sendingAll ? 'Envoi…' : 'Envoyer les signatures'}
            </button>
            <a href={`/api/pdf/poei-certificats/${poeiId}`} className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm">
              <Download className="h-4 w-4" /> Certificats (ZIP)
            </a>
          </div>
        )}
      </div>

      {/* Destinataire de facturation : agence France Travail */}
      <div className="rounded-xl bg-sky-50/60 border border-sky-100 p-3 flex items-center gap-3 flex-wrap">
        <Building2 className="h-4 w-4 text-sky-600 shrink-0" />
        <span className="text-sm text-surface-700">Facturé à <strong>France Travail</strong> :</span>
        <select value={agenceId} onChange={(e) => chooseAgence(e.target.value)}
          className="input-base !py-1.5 text-sm max-w-xs">
          <option value="">— Choisir une agence —</option>
          {agences.map((a) => <option key={a.id} value={a.id}>{a.nom}{a.ville ? ` (${a.ville})` : ''}</option>)}
        </select>
        <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800">
          <Plus className="h-3.5 w-3.5" /> Nouvelle agence
        </button>
        {!agenceId && <span className="text-xs text-amber-600">La facture sera adressée à l’entreprise tant qu’aucune agence n’est choisie.</span>}
      </div>

      {/* Numéro d'engagement France Travail — figure sur chaque facture */}
      <div className="rounded-xl bg-surface-50 border border-surface-200/70 p-3 flex items-center gap-3 flex-wrap">
        <FileText className="h-4 w-4 text-surface-500 shrink-0" />
        <span className="text-sm text-surface-700">N° d’engagement par défaut <span className="text-surface-400">(utilisé si un candidat n’a pas le sien)</span> :</span>
        <input
          value={engagement}
          onChange={(e) => setEngagement(e.target.value)}
          onBlur={saveEngagement}
          placeholder="ex. 40A462603C85"
          className="input-base !py-1.5 text-sm font-mono max-w-[16rem]"
        />
        <Button size="sm" variant="secondary" onClick={saveEngagement} isLoading={savingEng}>Enregistrer</Button>
        <span className="text-xs text-surface-500">France Travail engage chaque candidat séparément : renseignez le numéro de chacun ci-dessous.</span>
      </div>

      {!sessionTerminee ? (
        <div className="flex items-center gap-2 rounded-xl bg-surface-50 border border-surface-200/70 px-4 py-3 text-sm text-surface-500">
          <Clock className="h-4 w-4 shrink-0" />
          Facturation et certificats disponibles une fois la <strong className="mx-1 text-surface-700">session terminée</strong>.
        </div>
      ) : candidats.length === 0 ? (
        <div className="text-sm text-surface-500">Aucun candidat.</div>
      ) : (
        <div className="rounded-xl border border-surface-200 divide-y divide-surface-100 overflow-hidden">
          {candidats.map((c) => {
            const nom = `${c.apprenant?.prenom || ''} ${c.apprenant?.nom || ''}`.trim() || 'Candidat'
            const fac = facturesByCandidat[c.id]
            const st = fac ? (FACT_STATUS[fac.status] || FACT_STATUS.brouillon) : null
            return (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-900 truncate">{nom}</div>
                  {fac && (
                    <div className="text-xs text-surface-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${st!.cls}`}>{st!.label}</span>
                      {fac.numero && <span>{fac.numero}</span>}
                      {fac.montant_ttc != null && <span className="tabular-nums">{Number(fac.montant_ttc).toLocaleString('fr-FR')} €</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <EngagementCandidat
                    candidatId={c.id}
                    valeur={c.numero_engagement || ''}
                    verrouille={!!fac && fac.status !== 'brouillon'}
                  />
                  {fac ? (
                    <a href={`/api/pdf/facture/${fac.id}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-2.5 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50">
                      <FileText className="h-3.5 w-3.5" /> Facture
                    </a>
                  ) : (
                    <span className="text-xs text-surface-300 px-2.5">Pas de facture</span>
                  )}
                  {c.apprenant?.id && sessionId && (
                    <a href={`/api/pdf/certificat-realisation/${c.apprenant.id}?session=${sessionId}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-2.5 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50">
                      <Award className="h-3.5 w-3.5" /> Certificat
                    </a>
                  )}
                  {c.apprenant?.id && (() => {
                    const sg = signatures[c.apprenant.id]
                    if (sg?.signed_at) return (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Signé
                      </span>
                    )
                    return (
                      <button onClick={() => sendSignature(c.apprenant!.id)} disabled={sending === c.apprenant.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50">
                        <PenLine className="h-3.5 w-3.5" /> {sg?.sent_at ? 'Relancer' : 'Faire signer'}
                      </button>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle agence France Travail" size="md">
        <form onSubmit={createAgence} className="space-y-3">
          <Input name="nom" label="Nom de l’agence *" placeholder="FRANCE TRAVAIL DR OCCITANIE" required />
          <Input name="adresse" label="Adresse" placeholder="33/43 Avenue Georges Pompidou" />
          <div className="grid grid-cols-2 gap-3">
            <Input name="code_postal" label="Code postal" placeholder="31131" />
            <Input name="ville" label="Ville" placeholder="BALMA Cedex" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="siret" label="SIRET" placeholder="13000548116990" />
            <Input name="tva_intra" label="TVA intra" placeholder="FR19130005481" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit" isLoading={savingAg} icon={<Plus className="h-4 w-4" />}>Créer &amp; rattacher</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
