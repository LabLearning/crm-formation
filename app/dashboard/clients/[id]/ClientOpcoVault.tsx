'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, KeyRound, Copy, Check, Save, Trash2, Loader2 } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { saveClientOpcoSecretAction, revealClientOpcoSecretAction, deleteClientOpcoSecretAction } from '../actions'

interface Secret { identifiant?: string; mot_de_passe?: string; url?: string; notes?: string }

export function ClientOpcoVault({ clientId, hasSecret, hint }: { clientId: string; hasSecret: boolean; hint?: string | null }) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, start] = useTransition()
  const [mode, setMode] = useState<'locked' | 'revealed' | 'edit'>(hasSecret ? 'locked' : 'edit')
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState<Secret | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  // édition
  const [form, setForm] = useState<Secret>({})
  const [protectPw, setProtectPw] = useState('')

  function copy(v: string, k: string) {
    navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500)
  }

  function reveal() {
    if (!password) return
    start(async () => {
      const r = await revealClientOpcoSecretAction(clientId, password)
      if (r.success) { setRevealed(r.data as Secret); setMode('revealed'); setPassword('') }
      else toast('error', r.error || 'Erreur')
    })
  }

  function save() {
    if (!protectPw) { toast('error', 'Choisissez un mot de passe de protection'); return }
    start(async () => {
      const r = await saveClientOpcoSecretAction(clientId, form, protectPw)
      if (r.success) { toast('success', 'Compte OPCO chiffré et enregistré'); setForm({}); setProtectPw(''); setRevealed(null); setMode('locked'); router.refresh() }
      else toast('error', r.error || 'Erreur')
    })
  }

  function remove() {
    if (!confirm('Supprimer le compte OPCO enregistré ?')) return
    const pw = prompt('Mot de passe de protection pour confirmer la suppression :')
    if (!pw) return
    start(async () => {
      const r = await deleteClientOpcoSecretAction(clientId, pw)
      if (r.success) { toast('success', 'Compte OPCO supprimé'); setMode('edit'); setRevealed(null); router.refresh() }
      else toast('error', r.error || 'Erreur')
    })
  }

  const Field = ({ label, value, k, mono }: { label: string; value?: string; k: string; mono?: boolean }) => (
    value ? (
      <div className="flex items-center justify-between gap-2 py-1.5">
        <div className="min-w-0">
          <div className="text-2xs uppercase tracking-wider text-surface-400">{label}</div>
          <div className={`text-sm text-surface-800 truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
        </div>
        <button type="button" onClick={() => copy(value, k)} className="shrink-0 p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700">
          {copied === k ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    ) : null
  )

  return (
    <div className="card p-5 border border-amber-100 bg-amber-50/20">
      <div className="mb-3 flex items-center gap-2">
        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Données chiffrées</span>
      </div>

      {/* Verrouillé : demander le mot de passe pour consulter */}
      {mode === 'locked' && (
        <div className="space-y-3">
          <p className="text-xs text-surface-500">Données sensibles chiffrées. Saisissez le mot de passe pour les consulter.</p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input id="opco-pw" type="password" label="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') reveal() }} placeholder="••••••••" />
            </div>
            <Button onClick={reveal} isLoading={pending} disabled={!password} icon={<KeyRound className="h-4 w-4" />}>Consulter</Button>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
            <Lock className="h-3 w-3 shrink-0" /> Protégé par mot de passe
          </div>
        </div>
      )}

      {/* Révélé : afficher les identifiants */}
      {mode === 'revealed' && revealed && (
        <div className="space-y-1">
          <div className="rounded-xl bg-white border border-surface-100 px-3 divide-y divide-surface-100">
            <Field label="Identifiant" value={revealed.identifiant} k="id" mono />
            <div className="flex items-center justify-between gap-2 py-1.5">
              <div className="min-w-0">
                <div className="text-2xs uppercase tracking-wider text-surface-400">Mot de passe</div>
                <div className="text-sm text-surface-800 font-mono truncate">{showPw ? (revealed.mot_de_passe || '—') : '••••••••••'}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setShowPw((v) => !v)} className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700">
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                {revealed.mot_de_passe && (
                  <button type="button" onClick={() => copy(revealed.mot_de_passe!, 'pw')} className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700">
                    {copied === 'pw' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
            <Field label="Notes" value={revealed.notes} k="notes" />
          </div>
          <div className="flex items-center gap-3 pt-3">
            <Button size="sm" variant="secondary" onClick={() => { setRevealed(null); setShowPw(false); setMode('locked') }} icon={<Lock className="h-3.5 w-3.5" />}>Masquer</Button>
            <Button size="sm" variant="secondary" onClick={() => { setForm(revealed); setMode('edit') }}>Modifier</Button>
            <button onClick={remove} className="ml-auto text-xs text-danger-500 hover:text-danger-700 inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
          </div>
        </div>
      )}

      {/* Édition / première saisie */}
      {mode === 'edit' && (
        <div className="space-y-3">
          <Input id="opco-id" label="Identifiant" value={form.identifiant || ''} onChange={(e) => setForm({ ...form, identifiant: e.target.value })} placeholder="Identifiant" />
          <Input id="opco-mdp" label="Mot de passe" value={form.mot_de_passe || ''} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} placeholder="Mot de passe" />
          <Input id="opco-notes" label="Notes (optionnel)" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="pt-2 border-t border-amber-100 space-y-3">
            <p className="text-[11px] text-surface-500">Ces données sont <strong>chiffrées</strong>. Choisissez un mot de passe de protection — il sera demandé pour les consulter. Il n'est <strong>pas récupérable</strong> : notez-le bien.</p>
            <Input id="opco-protect" type="password" label="Mot de passe de protection *" value={protectPw} onChange={(e) => setProtectPw(e.target.value)} />
            <div className="flex justify-end gap-3">
              {hasSecret && <Button size="sm" variant="secondary" onClick={() => setMode('locked')}>Annuler</Button>}
              <Button size="sm" onClick={save} isLoading={pending} icon={<Save className="h-4 w-4" />}>Chiffrer et enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
