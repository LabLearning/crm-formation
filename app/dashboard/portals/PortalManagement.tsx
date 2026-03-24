'use client'

import { useState } from 'react'
import {
  Plus, Link as LinkIcon, Trash2, Copy, CheckCircle2,
  Users, Presentation, ExternalLink, Globe,
} from 'lucide-react'
import { Button, Badge, Modal, Select, useToast } from '@/components/ui'
import { generatePortalTokenAction, revokePortalTokenAction } from './actions'
import { formatDate } from '@/lib/utils'

interface PortalManagementProps {
  tokens: any[]
  apprenants: { id: string; prenom: string; nom: string; email: string | null }[]
  formateurs: { id: string; prenom: string; nom: string; email: string | null }[]
  appUrl: string
}

export function PortalManagement({ tokens, apprenants, formateurs, appUrl }: PortalManagementProps) {
  const { toast } = useToast()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateType, setGenerateType] = useState<'apprenant' | 'formateur'>('apprenant')
  const [selectedId, setSelectedId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const apprenantOptions = apprenants.map((a) => ({
    value: a.id,
    label: `${a.prenom} ${a.nom}${a.email ? ` (${a.email})` : ''}`,
  }))

  const formateurOptions = formateurs.map((f) => ({
    value: f.id,
    label: `${f.prenom} ${f.nom}${f.email ? ` (${f.email})` : ''}`,
  }))

  function getPortalUrl(token: string): string {
    return `${appUrl}/portail/${token}`
  }

  async function handleGenerate() {
    if (!selectedId) { toast('error', 'Sélectionnez une personne'); return }

    const list = generateType === 'apprenant' ? apprenants : formateurs
    const person = list.find((p) => p.id === selectedId)
    if (!person || !person.email) { toast('error', 'Cette personne n\'a pas d\'email'); return }

    setIsGenerating(true)
    const result = await generatePortalTokenAction(generateType, selectedId, person.email)

    if (result.success) {
      const tokenData = result.data as { token: string; existing: boolean }
      if (tokenData.existing) {
        toast('info', 'Un accès existe déjà pour cette personne')
      } else {
        toast('success', 'Accès portail généré')
      }
      await navigator.clipboard.writeText(getPortalUrl(tokenData.token))
      toast('success', 'Lien copié dans le presse-papier')
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

  const apprenantTokens = tokens.filter((t) => t.type === 'apprenant' && t.is_active)
  const formateurTokens = tokens.filter((t) => t.type === 'formateur' && t.is_active)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Portails externes</h1>
          <p className="text-surface-500 mt-1 text-sm">Gérez les accès des apprenants et formateurs à leur espace personnel</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)} icon={<Plus className="h-4 w-4" />}>
          Générer un accès
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-purple-50"><Users className="h-5 w-5 text-purple-600" /></div>
          <div>
            <div className="text-xs text-surface-500">Portails apprenants</div>
            <div className="text-xl font-heading font-bold text-purple-600">{apprenantTokens.length}</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-brand-50"><Presentation className="h-4 w-4 text-surface-600" /></div>
          <div>
            <div className="text-xs text-surface-500">Portails formateurs</div>
            <div className="text-xl font-heading font-bold text-brand-600">{formateurTokens.length}</div>
          </div>
        </div>
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
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Expire</th>
                <th className="text-right text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {tokens.filter((t) => t.is_active).map((t) => {
                const person = t.type === 'apprenant' ? t.apprenant : t.formateur
                const name = person ? `${person.prenom} ${person.nom}` : t.email
                return (
                  <tr key={t.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-medium text-surface-900">{name}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={t.type === 'apprenant' ? 'info' : 'success'}>
                        {t.type === 'apprenant' ? 'Apprenant' : 'Formateur'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 hidden md:table-cell text-sm text-surface-500">{t.email}</td>
                    <td className="px-6 py-3.5 hidden lg:table-cell text-sm text-surface-500">
                      {t.last_used_at ? formatDate(t.last_used_at, { day: 'numeric', month: 'short' }) : 'Jamais'}
                    </td>
                    <td className="px-6 py-3.5 hidden lg:table-cell text-sm text-surface-500">
                      {t.expires_at && formatDate(t.expires_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                )
              })}
            </tbody>
          </table>
        </div>
        {tokens.filter((t) => t.is_active).length === 0 && (
          <div className="text-center py-12">
            <Globe className="h-6 w-6 text-surface-400" />
            <p className="text-sm text-surface-500">Aucun accès portail généré</p>
            <p className="text-xs text-surface-400 mt-1">Générez des accès pour que vos apprenants et formateurs accèdent à leur espace</p>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      <Modal isOpen={generateOpen} onClose={() => setGenerateOpen(false)} title="Générer un accès portail">
        <div className="space-y-4">
          <p className="text-sm text-surface-600">
            Générez un lien d'accès personnel pour un apprenant ou un formateur. Ce lien leur permet d'accéder à leur espace sans créer de compte.
          </p>

          <div className="flex gap-2">
            {(['apprenant', 'formateur'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setGenerateType(t); setSelectedId('') }}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  generateType === t
                    ? 'bg-brand-50 text-brand-700 border-2 border-brand-200'
                    : 'bg-surface-50 text-surface-600 border-2 border-transparent hover:bg-surface-100'
                }`}
              >
                {t === 'apprenant' ? 'Apprenant' : 'Formateur'}
              </button>
            ))}
          </div>

          <Select
            label={generateType === 'apprenant' ? 'Sélectionner un apprenant' : 'Sélectionner un formateur'}
            options={generateType === 'apprenant' ? apprenantOptions : formateurOptions}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            placeholder="Choisir..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setGenerateOpen(false)}>Annuler</Button>
            <Button onClick={handleGenerate} isLoading={isGenerating} icon={<LinkIcon className="h-4 w-4" />}>
              Générer et copier le lien
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
