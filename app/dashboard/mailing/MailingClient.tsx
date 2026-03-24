'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Mails, Send, User, Building2, Search, Plus, Trash2,
  Copy, Eye, Edit3, Check, X, Save, Clock,
} from 'lucide-react'
import { Button, Badge, Modal, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Contact {
  id: string; nom: string; email: string; entreprise: string
  source: 'lead' | 'client'; status: string
}

interface Template {
  id: string; name: string; subject: string; body: string
}

interface HistoryEntry {
  id: string; date: string; to: string; toName: string
  subject: string; templateName: string
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'catalogue', name: 'Envoi Catalogue',
    subject: 'Catalogue de formations {ORG}',
    body: 'Bonjour {NOM},\n\nVeuillez trouver ci-joint notre catalogue de formations.\n\nNous proposons un large panel de formations dans les domaines de l\'hygiène alimentaire, la sécurité au travail, et le management.\n\nToutes nos formations sont éligibles à une prise en charge par votre OPCO, sans avance de frais.\n\nN\'hésitez pas à nous contacter pour plus d\'informations.\n\nCordialement,\n{COMMERCIAL}',
  },
  {
    id: 'relance', name: 'Relance',
    subject: 'Suite à notre échange - {ORG}',
    body: 'Bonjour {NOM},\n\nJe me permets de revenir vers vous suite à notre dernier échange.\n\nAvez-vous eu le temps de consulter notre proposition ? Je reste à votre disposition pour répondre à vos questions.\n\nCordialement,\n{COMMERCIAL}',
  },
  {
    id: 'rdv', name: 'Proposition RDV',
    subject: 'Planifions un échange - {ORG}',
    body: 'Bonjour {NOM},\n\nJe souhaiterais planifier un court échange téléphonique pour discuter de vos besoins en formation.\n\nSeriez-vous disponible cette semaine ?\n\nCordialement,\n{COMMERCIAL}',
  },
]

interface MailingClientProps {
  contacts: Contact[]; orgName: string; userName: string
}

export function MailingClient({ contacts, orgName, userName }: MailingClientProps) {
  const { toast } = useToast()

  // Compose
  const [toEmail, setToEmail] = useState('')
  const [toName, setToName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<'libre' | 'template'>('libre')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Templates
  const [templates, setTemplates] = useState<Template[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('ll_mail_templates'); if (s) return JSON.parse(s) } catch {}
    }
    return DEFAULT_TEMPLATES
  })
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  // History
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('ll_mail_history'); if (s) return JSON.parse(s) } catch {}
    }
    return []
  })

  // UI
  const [tab, setTab] = useState<'envoyer' | 'templates' | 'historique'>('envoyer')
  const [contactSearch, setContactSearch] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Prefill from lead
  useEffect(() => {
    try {
      const pf = localStorage.getItem('ll_prefill_mailing')
      if (pf) {
        const d = JSON.parse(pf)
        if (d.destinataire) setToEmail(d.destinataire)
        if (d.nom) setToName(d.nom)
        localStorage.removeItem('ll_prefill_mailing')
      }
    } catch {}
  }, [])

  // Filter contacts
  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts.slice(0, 20)
    const q = contactSearch.toLowerCase()
    return contacts.filter(c =>
      c.nom.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.entreprise.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [contacts, contactSearch])

  function pickContact(c: Contact) {
    setToEmail(c.email); setToName(c.nom)
  }

  function applyTemplate(tpl: Template) {
    setSelectedTemplate(tpl.id)
    setSubject(tpl.subject.replace(/\{ORG\}/g, orgName))
    setBody(tpl.body.replace(/\{NOM\}/g, toName || 'Monsieur/Madame').replace(/\{COMMERCIAL\}/g, userName).replace(/\{ORG\}/g, orgName))
    setMode('template')
  }

  // Preview with vars replaced
  const previewBody = useMemo(() => {
    return body
      .replace(/\{NOM\}/g, toName || 'Monsieur/Madame')
      .replace(/\{COMMERCIAL\}/g, userName)
      .replace(/\{ORG\}/g, orgName)
  }, [body, toName, userName, orgName])

  const previewSubject = useMemo(() => {
    return subject
      .replace(/\{NOM\}/g, toName || '')
      .replace(/\{ORG\}/g, orgName)
  }, [subject, toName, orgName])

  function handleSend() {
    if (!toEmail) { toast('error', 'Email destinataire requis'); return }
    if (!subject) { toast('error', 'Objet requis'); return }

    const entry: HistoryEntry = {
      id: `mail_${Date.now()}`,
      date: new Date().toISOString(),
      to: toEmail, toName: toName || toEmail,
      subject: previewSubject,
      templateName: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name || '' : 'Libre',
    }
    const newHistory = [entry, ...history].slice(0, 200)
    setHistory(newHistory)
    localStorage.setItem('ll_mail_history', JSON.stringify(newHistory))

    // Copy to clipboard
    navigator.clipboard.writeText(`À : ${toEmail}\nObjet : ${previewSubject}\n\n${previewBody}`)

    toast('success', `Email copié (${toEmail})`)

    // Reset
    setToEmail(''); setToName(''); setSubject(''); setBody(''); setSelectedTemplate(null)
  }

  // Template CRUD
  function saveTemplate(tpl: Template) {
    const updated = tpl.id.startsWith('new_')
      ? [...templates, { ...tpl, id: `tpl_${Date.now()}` }]
      : templates.map(t => t.id === tpl.id ? tpl : t)
    setTemplates(updated)
    localStorage.setItem('ll_mail_templates', JSON.stringify(updated))
    setShowTemplateModal(false)
    setEditingTemplate(null)
    toast('success', 'Template enregistré')
  }
  function deleteTemplate(id: string) {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem('ll_mail_templates', JSON.stringify(updated))
    toast('success', 'Template supprimé')
  }

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
    return {
      today: history.filter(h => h.date.startsWith(todayStr)).length,
      week: history.filter(h => h.date >= weekAgo).length,
      total: history.length,
    }
  }, [history])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Mailing</h1>
          <p className="text-surface-500 mt-1 text-sm">
            {stats.today} envoi{stats.today > 1 ? 's' : ''} aujourd'hui · {stats.week} cette semaine · {contacts.length} contacts
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-0.5 w-fit">
        {([
          { id: 'envoyer', label: 'Envoyer' },
          { id: 'templates', label: `Templates (${templates.length})` },
          { id: 'historique', label: `Historique (${history.length})` },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === t.id ? 'bg-white shadow-xs text-surface-900' : 'text-surface-500 hover:text-surface-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ENVOYER ─── */}
      {tab === 'envoyer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Destinataire */}
            <div className="card p-5 space-y-3">
              <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight">Destinataire</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-surface-500 mb-1.5 block">Email *</label>
                  <input className="input-base" type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="email@exemple.fr" />
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-500 mb-1.5 block">Nom</label>
                  <input className="input-base" value={toName} onChange={e => setToName(e.target.value)} placeholder="Nom du contact" />
                </div>
              </div>
            </div>

            {/* Quick template selector */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setMode('libre'); setSelectedTemplate(null); setSubject(''); setBody('') }}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', mode === 'libre' && !selectedTemplate ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200')}>
                Texte libre
              </button>
              {templates.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', selectedTemplate === t.id ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200')}>
                  {t.name}
                </button>
              ))}
            </div>

            {/* Compose */}
            <div className="card p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-surface-500 mb-1.5 block">Objet</label>
                <input className="input-base" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet de l'email" />
              </div>
              <div>
                <label className="text-xs font-medium text-surface-500 mb-1.5 block">Message</label>
                <textarea className="input-base resize-none" rows={10} value={body} onChange={e => setBody(e.target.value)} placeholder="Contenu de l'email..." />
              </div>
              <div className="text-xs text-surface-400">Variables : {'{NOM}'}, {'{COMMERCIAL}'}, {'{ORG}'}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleSend} icon={<Copy className="h-4 w-4" />} disabled={!toEmail || !subject}>
                Copier l'email
              </Button>
              <Button variant="secondary" onClick={() => setShowPreview(true)} icon={<Eye className="h-4 w-4" />} disabled={!body}>
                Aperçu
              </Button>
            </div>
          </div>

          {/* Contact list sidebar */}
          <div className="space-y-3">
            <div className="card p-4">
              <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-3">Contacts CRM</div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input className="input-base pl-9 text-sm" placeholder="Rechercher..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
              </div>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredContacts.map(c => (
                  <button key={c.id + c.email} onClick={() => pickContact(c)}
                    className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-surface-100', toEmail === c.email && 'bg-surface-100 ring-1 ring-surface-200')}>
                    <div className="font-medium text-surface-800 truncate">{c.nom || c.email}</div>
                    <div className="text-xs text-surface-400 truncate">
                      {c.entreprise && `${c.entreprise} · `}{c.email}
                    </div>
                  </button>
                ))}
                {filteredContacts.length === 0 && (
                  <div className="text-xs text-surface-400 text-center py-4">Aucun contact trouvé</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TEMPLATES ─── */}
      {tab === 'templates' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingTemplate({ id: `new_${Date.now()}`, name: '', subject: '', body: '' }); setShowTemplateModal(true) }} icon={<Plus className="h-4 w-4" />}>
              Nouveau template
            </Button>
          </div>
          {templates.map(t => (
            <div key={t.id} className="card p-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-heading font-semibold text-surface-900">{t.name}</div>
                <div className="text-xs text-surface-500 mt-0.5">Objet : {t.subject}</div>
                <div className="text-xs text-surface-400 mt-1 line-clamp-2">{t.body.substring(0, 150)}...</div>
              </div>
              <div className="flex gap-1.5 ml-3 shrink-0">
                <button onClick={() => applyTemplate(t)} className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Utiliser">
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setEditingTemplate(t); setShowTemplateModal(true) }} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors" title="Modifier">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteTemplate(t.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors" title="Supprimer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── HISTORIQUE ─── */}
      {tab === 'historique' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="table-header">Date</th>
                  <th className="table-header">Destinataire</th>
                  <th className="table-header">Objet</th>
                  <th className="table-header">Template</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {history.map(h => (
                  <tr key={h.id} className="table-row">
                    <td className="table-cell text-sm text-surface-500">
                      {new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-medium text-surface-800">{h.toName}</div>
                      <div className="text-xs text-surface-400">{h.to}</div>
                    </td>
                    <td className="table-cell text-sm text-surface-600 max-w-[200px] truncate">{h.subject}</td>
                    <td className="table-cell"><Badge>{h.templateName}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-14">
              <Mails className="h-6 w-6 text-surface-400 mb-3" />
              <p className="text-sm text-surface-500">Aucun email envoyé</p>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Aperçu de l'email">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-surface-400">À</div>
            <div className="text-sm font-medium text-surface-800">{toName} &lt;{toEmail}&gt;</div>
          </div>
          <div>
            <div className="text-xs text-surface-400">Objet</div>
            <div className="text-sm font-medium text-surface-800">{previewSubject}</div>
          </div>
          <div className="border-t border-surface-100 pt-3">
            <div className="whitespace-pre-line text-sm text-surface-700 leading-relaxed">{previewBody}</div>
          </div>
        </div>
      </Modal>

      {/* Template Edit Modal */}
      {showTemplateModal && editingTemplate && (
        <Modal isOpen={true} onClose={() => { setShowTemplateModal(false); setEditingTemplate(null) }} title={editingTemplate.id.startsWith('new_') ? 'Nouveau template' : 'Modifier le template'}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Nom</label>
              <input className="input-base" value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} placeholder="Nom du template" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Objet</label>
              <input className="input-base" value={editingTemplate.subject} onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} placeholder="Objet de l'email" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Contenu</label>
              <textarea className="input-base resize-none" rows={8} value={editingTemplate.body} onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })} />
            </div>
            <div className="text-xs text-surface-400">Variables : {'{NOM}'}, {'{COMMERCIAL}'}, {'{ORG}'}</div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null) }}>Annuler</Button>
              <Button onClick={() => saveTemplate(editingTemplate)} icon={<Save className="h-4 w-4" />}>Enregistrer</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
