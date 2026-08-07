'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, PenLine, Route, Wrench } from 'lucide-react'
import { useToast, Button } from '@/components/ui'
import { SignaturePad } from '@/app/portail/[token]/emargement/SignaturePad'
import { ETAPES, TRACABILITE, PHILOSOPHIE, POSTURE, DPO_TITRE, DPO_VERSION } from '@/lib/dpo'
import { signerDpoAction } from '@/app/dashboard/sessions/[id]/deroule-actions'
import { formatDate } from '@/lib/utils'

/**
 * Le formateur prend connaissance du déroulé opérationnel et s'y engage par
 * signature. La signature porte sur une version : si la méthode évolue, il
 * doit signer la nouvelle.
 */
export function DerouleSignature({
  formateurName, signature,
}: {
  formateurName: string
  signature: { version: string; signed_at: string } | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [padOuvert, setPadOuvert] = useState(false)
  const [pending, setPending] = useState(false)

  async function signer(data: string) {
    setPending(true)
    const res = await signerDpoAction(data)
    setPending(false)
    if (!res.success) { toast('error', res.error || 'Erreur'); return }
    setPadOuvert(false)
    toast('success', 'Engagement signé')
    router.refresh()
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-xl md:text-2xl font-heading font-bold text-surface-900 tracking-heading flex items-center gap-2">
          <Route className="h-5 w-5 text-brand-500" />
          Déroulé pédagogique opérationnel
        </h1>
        <p className="text-surface-500 mt-1 text-sm">{DPO_TITRE}</p>
        <p className="text-surface-400 mt-0.5 text-xs">Audit → Actions → Formation → Audit de sortie · version {DPO_VERSION}</p>
        <p className="text-surface-500 mt-3 text-sm rounded-xl bg-surface-50 border border-surface-200/70 p-3">
          Ce déroulé est propre aux <strong className="text-surface-700">formations hygiène (HACCP / PMS)</strong>. Sur toute
          session, quel qu&apos;en soit le sujet, s&apos;ajoutent les quatre jalons du parcours qualité : positionnement,
          évaluation des acquis, satisfaction à chaud puis à froid à trois mois.
        </p>
      </div>

      {signature ? (
        <div className="card p-4 border-success-200 bg-success-50/40 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" />
          <div className="text-sm text-surface-700">
            <span className="font-medium">Engagement signé</span> le {formatDate(signature.signed_at)} — version {signature.version}.
          </div>
        </div>
      ) : (
        <div className="card p-4 border-danger-200 bg-danger-50/40 flex flex-wrap items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-danger-500 shrink-0" />
          <div className="text-sm text-surface-700 flex-1 min-w-[12rem]">
            <span className="font-medium">Signature requise.</span> Ce déroulé est la méthode d&apos;intervention de Lab Learning :
            chaque formateur s&apos;y engage avant d&apos;intervenir.
          </div>
          <Button onClick={() => setPadOuvert(true)} icon={<PenLine className="h-4 w-4" />}>Signer</Button>
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-heading font-semibold text-surface-900 mb-3">Philosophie de l&apos;intervention</h2>
        <ul className="space-y-1.5">
          {PHILOSOPHIE.map((p) => (
            <li key={p} className="text-sm text-surface-700 flex gap-2"><span className="text-surface-300">·</span>{p}</li>
          ))}
        </ul>
        <p className="text-sm text-surface-600 italic mt-3 pt-3 border-t border-surface-100">{POSTURE}</p>
      </div>

      {ETAPES.map((e) => (
        <div key={e.cle} className="card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="h-7 w-7 rounded-lg bg-surface-900 text-white text-xs font-heading font-bold flex items-center justify-center shrink-0">
              {e.numero}
            </span>
            <h2 className="text-sm font-heading font-semibold text-surface-900">{e.titre}</h2>
          </div>
          <p className="text-xs text-surface-500 italic mb-3">{e.intention}</p>

          <div className="section-label mb-1.5">Objectifs pédagogiques</div>
          <ul className="space-y-1 mb-3">
            {e.objectifs.map((o) => (
              <li key={o} className="text-sm text-surface-700 flex gap-2"><span className="text-surface-300">·</span>{o}</li>
            ))}
          </ul>

          <div className="section-label mb-1.5">Attendus</div>
          <ul className="space-y-1">
            {e.attendus.map((a) => (
              <li key={a} className="text-sm text-surface-700 flex gap-2"><span className="text-surface-300">·</span>{a}</li>
            ))}
          </ul>

          {e.outil && (
            <div className="rounded-xl bg-brand-50/60 border border-brand-100 p-3 flex items-start gap-2.5 mt-3">
              <Wrench className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
              <div className="text-sm text-surface-700">
                <span className="font-medium">{e.outil.nom}</span> — {e.outil.ou}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="card p-5">
        <h2 className="text-sm font-heading font-semibold text-surface-900 mb-3">Traçabilité et évaluations</h2>
        <div className="space-y-4">
          {TRACABILITE.map((bloc) => (
            <div key={bloc.moment}>
              <div className="section-label mb-1.5">{bloc.moment}</div>
              <ul className="space-y-1.5">
                {bloc.items.map((i) => (
                  <li key={i.cle} className="text-sm text-surface-700">
                    {i.label}
                    <span className="block text-xs text-surface-400">{i.outil}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {!signature && (
        <div className="flex justify-end">
          <Button onClick={() => setPadOuvert(true)} icon={<PenLine className="h-4 w-4" />}>
            Signer mon engagement
          </Button>
        </div>
      )}

      {padOuvert && (
        <SignaturePad
          title="Engagement sur le déroulé opérationnel"
          subtitle={`${formateurName} — version ${DPO_VERSION}`}
          onSign={signer}
          onCancel={() => setPadOuvert(false)}
          isPending={pending}
          validateLabel="Je m'engage à appliquer ce déroulé"
        />
      )}
    </div>
  )
}
