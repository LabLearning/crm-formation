'use client'

import { useState } from 'react'
import {
  Plus, Link as LinkIcon, Trash2, Copy, CheckCircle2,
  Users, Presentation, ExternalLink, Globe, Mail, Building2,
  Handshake, GraduationCap,
} from 'lucide-react'
import { Button, Badge, Modal, Select, useToast } from '@/components/ui'
import { generatePortalTokenAction, revokePortalTokenAction, resendPortalEmailAction } from './actions'
import { formatDate } from '@/lib/utils'

type PortalType = 'apprenant' | 'formateur' | 'client' | 'apporteur'

interface PortalManagementProps {
  tokens: any[]
  apprenants: { id: string; prenom: string; nom: string; email: string | null }[]
  formateurs: { id: string; prenom: string; nom: string; email: string | null }[]
  clients: { id: string; raison_sociale: string | null; email: string | null; type: string }[]
  apporteurs: { id: string; nom: string; prenom: string | null; email: string | null; categorie: string | null; nom_enseigne: string | null }[]
  appUrl: string
}

const TYPE_CONFIG: Record<PortalType, { label: string; labelPlural: string; icon: any; color: string; badgeVariant: any }> = {
  apprenant: { label: 'Apprenant', labelPlural: 'Apprenants', icon: GraduationCap, color: 'text-purple-600', badgeVariant: 'info' },
  formateur: { label: 'Formateur', labelPlural: 'Formateurs', icon: Presentation, color: 'text-brand-600', badgeVariant: 'success' },
  client: { label: 'Client', labelPlural: 'Clients', icon: Building2, color: 'text-emerald-600', badgeVariant: 'default' },
  apporteur: { label: 'Apporteur / Partenaire', labelPlural: 'Apporteurs', icon: Handshake, color: 'text-amber-600', badgeVariant: 'warning' },
}

export function PortalManagement({ tokens, apprenants, formateurs, clients, apporteurs, appUrl }: PortalManagementProps) {
  const { toast } = useToast()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateType, setGenerateType] = useState<PortalType>('apprenant')
  const [selectedId, setSelectedId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)

  function getPortalUrl(token: string) {
    return `${appUrl}/portail/${token}`
  }

  function getOptions(type: PortalType) {
    if (type === 'apprenant') return apprenants.map(a => ({ value: a.id, label: `${a.prenom} ${a.nom}${a.email ? ` (${a.email})` : ''}` }))
    if (type === 'formateur') return formateurs.map(f => ({ value: f.id, label: `${f.prenom} ${f.nom}${f.email ? ` (${f.email})` : ''}` }))
    if (type === 'client') return clients.map(c => ({ value: c.id, label: `${c.raison_sociale || '—'}${c.email ? ` (${c.email})` : ''}` }))
    return apporteurs.map(a => ({
      value: a.id,
      label: `${a.prenom || ''} ${a.nom}${a.nom_enseigne ? ` — ${a.nom_enseigne}` : ''}${a.email ? ` (${a.email})` : ''}`.trim(),
    }))
  }

  function getEmailForSelected(type: PortalType, id: string): string | null {
    if (type === 'apprenant') return apprenants.find(a => a.id === id)?.email || null
    if (type === 'formateur') return formateurs.find(f => f.id === id)?.email || null
    if (type === 'client') return clients.find(c => c.id === id)?.email || null
    return apporteurs.find(a => a.id === id)?.email || null
  }

  async function handleGenerate() {
    if (!selectedId) { toast('error', 'Sélectionnez une personne'); return }
    const email = getEmailForSelected(generateType, selectedId)
    if (!email) { toast('error', 'Cette personne n\'a pas d\'email renseigné'); return }

    setIsGenerating(true)
    const result = await generatePortalTokenAction(generateType, selectedId, email, true)

    if (result.success) {
      const tokenData = result.data as { token: string; existing: boolean }
      if (tokenData.existing) {
        toast('info', 'Un accès existe déjà — lien copié')
      } else {
        toast('success', 'Accès généré et email envoyé')
      }
      await navigator.clipboard.writeText(getPortalUrl(tokenData.token))
      setGenerateOpen(false)
      setSelectedId('')
    } else {
      toast('error', result.error || 'Erreur')
    }
    setIsGenerating(false)
  }

  async function handleRevoke(tokenId: string) {
    if (!confirm('Révoquer cet accès ? La personne ne pourra plus se connecter.')) return
    const result = await revokePortalTokenAction(tokenId)
    if (result.success) toast('success', 'Accès révoqué')
    else toast('error', result.error || 'Erreur')
  }

  async function handleCopy(token: string) {
    await navigator.clipboard.writeText(getPortalUrl(token))
    setCopiedToken(token)
    toast('success', 'Lien copié')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  async function handleResendEmail(tokenId: string) {
    setSendingEmail(tokenId)
    const result = await resendPortalEmailAction(tokenId)
    if (result.success) toast('success', 'Email renvoyé')
    else toast('error', result.error || 'Erreur')
    setSendingEmail(null)
  }

  function getTokenName(t: any) {
    if (t.type === 'apprenant' && t.apprenant) return `${t.apprenant.prenom} ${t.apprenant.nom}`
    if (t.type === 'formateur' && t.formateur) return `${t.formateur.prenom} ${t.formateur.nom}`
    return t.email || '—'
  }

  function getTokenBadge(t: any) {
    if (t.type === 'apporteur') {
      // check if partenaire via email match in apporteurs list (we don't have categorie on token directly)
      return <Badge variant="warning">{t.type === 'apporteur' ? 'Apporteur' : 'Partenaire'}</Badge>
    }
    const cfg = TYPE_CONFIG[t.type as PortalType]
    return cfg ? <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge> : null
  }

  const activeTokens = tokens.filter(t => t.is_active)
  const counts = {
    apprenant: activeTokens.filter(t => t.type === 'apprenant').length,
    formateur: activeTokens.filter(t => t.type === 'formateur').length,
    client: activeTokens.filter(t => t.type === 'client').length,
    apporteur: activeTokens.filter(t => t.type === 'apporteur').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Portails externes</h1>
          <p className="text-surface-500 mt-1 text-sm">Gérez les accès à tous les espaces personnels — un email est envoyé automatiquement</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)} icon={<Plus className="h-4 w-4" />}>
          Générer un accès
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.entries(TYPE_CONFIG) as [PortalType, typeof TYPE_CONFIG[PortalType]][]).map(([type, cfg]) => (
          <div key={type} className="card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-surface-50`}>
              <cfg.icon className={`h-5 w-5 ${cfg.color}`} />
            </div>
            <div>
              <div className="text-xs text-surface-500">{cfg.labelPlural}</div>
              <div className={`text-xl font-heading font-bold ${cfg.color}`}>{counts[type]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tokens table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Personne</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Email</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Dernière visite</th>
                <th className="text-right text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {activeTokens.map((t) => (
                <tr key={t.id} className="hover:bg-surface-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-surface-900">{getTokenName(t)}</td>
                  <td className="px-6 py-3.5">{getTokenBadge(t)}</td>
                  <td className="px-6 py-3.5 hidden md:table-cell text-sm text-surface-500">{t.email}</td>
                  <td className="px-6 py-3.5 hidden lg:table-cell text-sm text-surface-500">
                    {t.last_used_at ? formatDate(t.last_used_at, { day: 'numeric', month: 'short' }) : 'Jamais'}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleResendEmail(t.id)}
                        disabled={sendingEmail === t.id}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
                        title="Renvoyer l'email d'accès"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCopy(t.token)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Copier le lien"
                      >
                        {copiedToken === t.token ? <CheckCircle2 className="h-4 w-4 text-success-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <a
                        href={getPortalUrl(t.token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Ouvrir le portail"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleRevoke(t.id)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                        title="Révoquer l'accès"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {activeTokens.length === 0 && (
          <div className="text-center py-16">
            <Globe className="h-6 w-6 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500">Aucun accès portail généré</p>
            <p className="text-xs text-surface-400 mt-1">Générez des accès pour que vos utilisateurs reçoivent leur lien par email</p>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      <Modal isOpen={generateOpen} onClose={() => { setGenerateOpen(false); setSelectedId('') }} title="Générer un accès portail">
        <div className="space-y-4">
          <p className="text-sm text-surface-600">
            Un lien d'accès personnel sera généré et <strong>envoyé automatiquement par email</strong> à la personne sélectionnée.
          </p>

          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(TYPE_CONFIG) as [PortalType, typeof TYPE_CONFIG[PortalType]][]).map(([type, cfg]) => (
              <button
                key={type}
                onClick={() => { setGenerateType(type); setSelectedId('') }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors border-2 ${
                  generateType === type
                    ? 'bg-brand-50 text-brand-700 border-brand-200'
                    : 'bg-surface-50 text-surface-600 border-transparent hover:bg-surface-100'
                }`}
              >
                <cfg.icon className="h-4 w-4 shrink-0" />
                {cfg.label}
              </button>
            ))}
          </div>

          <Select
            label={`Sélectionner un(e) ${TYPE_CONFIG[generateType].label.toLowerCase()}`}
            options={getOptions(generateType)}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            placeholder="Choisir..."
          />

          {selectedId && !getEmailForSelected(generateType, selectedId) && (
            <p className="text-xs text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">
              Cette personne n'a pas d'email renseigné — l'email ne pourra pas être envoyé.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setGenerateOpen(false); setSelectedId('') }}>Annuler</Button>
            <Button onClick={handleGenerate} isLoading={isGenerating} icon={<LinkIcon className="h-4 w-4" />}>
              Générer et envoyer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
