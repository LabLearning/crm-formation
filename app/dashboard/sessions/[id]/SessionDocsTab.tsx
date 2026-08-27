'use client'

import { FileText, Download, Users, Mail as MailIcon, GraduationCap, ClipboardCheck, Receipt, Award } from '@/components/ui/icons'

/**
 * Onglet Documents : les livrables de la session — convocation, émargement,
 * programme, certificats, facture — et les documents individuels par
 * apprenant (attestation de fin, certificat de réalisation, hygiène).
 * La contractualisation (conventions, contrats) a son propre onglet.
 */
interface Props {
  sessionId: string
  formationId?: string | null
  estHygiene?: boolean
  factureId?: string | null
  participants: { id: string; prenom: string | null; nom: string | null }[]
}

function BoutonDoc({ href, icon: Icon, titre, sous, teinte = 'brand' }: {
  href: string
  icon: any
  titre: string
  sous: string
  teinte?: 'brand' | 'blue' | 'amber' | 'emerald'
}) {
  const fonds = { brand: 'bg-brand-50 text-brand-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600' }[teinte]
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-surface-200 px-4 py-3 hover:border-brand-300 hover:bg-brand-50/40 transition-colors">
      <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${fonds}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-surface-900">{titre}</span>
        <span className="block text-xs text-surface-500">{sous}</span>
      </span>
      <Download className="h-4 w-4 text-surface-300 shrink-0" />
    </a>
  )
}

export function SessionDocsTab({ sessionId, formationId, estHygiene, factureId, participants }: Props) {
  return (
    <div className="space-y-4">
      {/* ── Documents de la session ── */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-500" />
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Documents de la session</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BoutonDoc href={`/api/pdf/convocation-session/${sessionId}`} icon={MailIcon}
            titre="Convocation" sous="Tous les participants, dates et horaires" />
          <BoutonDoc href={`/api/pdf/emargement/${sessionId}`} icon={ClipboardCheck} teinte="blue"
            titre="Feuille d'émargement" sous="Par demi-journée, à faire signer" />
          {formationId && (
            <BoutonDoc href={`/api/pdf/programme/${formationId}?session=${sessionId}`} icon={GraduationCap} teinte="emerald"
              titre="Programme de formation" sous="Avec le calendrier de la session" />
          )}
          <BoutonDoc href={`/api/pdf/certificats-session?session=${sessionId}`} icon={Award} teinte="amber"
            titre="Certificats de réalisation" sous="Tous les apprenants en un document" />
          {factureId && (
            <BoutonDoc href={`/api/pdf/facture/${factureId}`} icon={Receipt}
              titre="Facture" sous="Facture de la session" />
          )}
        </div>
      </div>

      {/* ── Documents par apprenant ── */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-500" />
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Documents par apprenant</span>
        </div>
        {participants.length === 0 ? (
          <div className="text-center py-8 text-xs text-surface-400">Aucun inscrit</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {participants.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
                <span className="text-sm font-medium text-surface-900 flex-1 min-w-[140px]">{a.prenom} {a.nom}</span>
                <a href={`/api/pdf/attestation/${a.id}?session=${sessionId}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium rounded-lg border border-surface-200 px-2.5 py-1.5 text-surface-600 hover:border-surface-300 transition-colors">
                  Attestation de fin
                </a>
                <a href={`/api/pdf/certificat-realisation/${a.id}?session=${sessionId}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium rounded-lg border border-surface-200 px-2.5 py-1.5 text-surface-600 hover:border-surface-300 transition-colors">
                  Certificat
                </a>
                {estHygiene && (
                  <a href={`/api/pdf/attestation-hygiene?session=${sessionId}&apprenant=${a.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium rounded-lg border border-surface-200 px-2.5 py-1.5 text-surface-600 hover:border-surface-300 transition-colors">
                    Attestation hygiène
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
