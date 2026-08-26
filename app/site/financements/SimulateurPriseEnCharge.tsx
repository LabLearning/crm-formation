'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, ArrowLeft, CheckCircle2, Building2, Loader2, Banknote } from '../icons'
import { BAREMES_BRANCHES } from '@/lib/opco-tarifs'
import { demanderEtudeFinancementAction } from './simulateur-actions'

export interface FormationSimu {
  id: string
  intitule: string
  duree_heures: number | null
  duree_jours: number | null
  branches: string[]
}

interface Entreprise { nom: string; naf: string; libelleNaf: string | null; brancheSuggeree: string | null }

const BRANCHES = Object.entries(BAREMES_BRANCHES).map(([slug, b]) => ({ slug, ...b }))

/**
 * Simulateur public de prise en charge OPCO : SIRET → branche → formation →
 * estimation d'après les barèmes réels de la branche — puis demande d'étude
 * qui devient un lead dans le CRM. L'outil de conversion de la page.
 */
export function SimulateurPriseEnCharge({ formations }: { formations: FormationSimu[] }) {
  const [etape, setEtape] = useState(1)
  const [siret, setSiret] = useState('')
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [chargeSiret, setChargeSiret] = useState(false)
  const [erreurSiret, setErreurSiret] = useState<string | null>(null)
  const [branche, setBranche] = useState<string | null>(null)
  const [formationId, setFormationId] = useState<string | null>(null)
  const [stagiaires, setStagiaires] = useState(4)
  const [dejaForme, setDejaForme] = useState<boolean | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null)

  const formationsBranche = useMemo(
    () => formations.filter((f) => !branche || (f.branches || []).includes(branche)),
    [formations, branche],
  )
  const formation = formations.find((f) => f.id === formationId) || null

  async function chercherSiret() {
    const s = siret.replace(/\s/g, '')
    if (!/^\d{14}$/.test(s)) { setErreurSiret('14 chiffres attendus'); return }
    setChargeSiret(true); setErreurSiret(null)
    try {
      const r = await fetch(`/api/public/entreprise?siret=${s}`)
      const d = await r.json()
      if (!r.ok) { setErreurSiret(d.error || 'Entreprise introuvable'); setEntreprise(null) }
      else {
        setEntreprise(d)
        if (d.brancheSuggeree) setBranche(d.brancheSuggeree)
      }
    } catch { setErreurSiret('Recherche indisponible — continuez sans SIRET') }
    setChargeSiret(false)
  }

  // Estimation d'après le barème de la branche et la durée de la formation
  const estimation = useMemo(() => {
    if (!branche || !formation) return null
    const b = BAREMES_BRANCHES[branche]
    if (!b) return null
    const h = formation.duree_heures || 0
    const j = formation.duree_jours || (h ? Math.ceil(h / 7) : 0)
    const fmt = (n: number) => `${n.toLocaleString('fr-FR')} €`
    if (b.tauxHoraire && h) {
      const total = b.tauxHoraire * h * stagiaires
      return { texte: fmt(total), detail: `${b.tauxHoraire} €/h × ${h} h × ${stagiaires} stagiaire${stagiaires > 1 ? 's' : ''}`, opco: b.opco }
    }
    if (b.forfaitJour && j) {
      const total = b.forfaitJour * j
      return { texte: fmt(total), detail: `forfait ${fmt(b.forfaitJour)}/jour × ${j} jour${j > 1 ? 's' : ''} (groupe)`, opco: b.opco }
    }
    if (b.tauxHoraireMin && b.tauxHoraireMax && h) {
      return {
        texte: `${fmt(b.tauxHoraireMin * h * stagiaires)} à ${fmt(b.tauxHoraireMax * h * stagiaires)}`,
        detail: `${b.tauxHoraireMin}–${b.tauxHoraireMax} €/h selon la formation × ${h} h × ${stagiaires} stagiaire${stagiaires > 1 ? 's' : ''}`,
        opco: b.opco,
      }
    }
    return null
  }, [branche, formation, stagiaires])

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnvoi(true); setErreurEnvoi(null)
    const fd = new FormData(e.currentTarget)
    fd.set('siret', siret)
    fd.set('entreprise', entreprise?.nom || '')
    fd.set('branche', branche ? BAREMES_BRANCHES[branche]?.label || branche : '')
    fd.set('formation', formation?.intitule || '')
    fd.set('formation_id', formation?.id || '')
    fd.set('stagiaires', String(stagiaires))
    fd.set('estimation', estimation ? `${estimation.texte} (${estimation.detail})` : '')
    fd.set('deja_forme', dejaForme ? 'oui' : 'non')
    const r = await demanderEtudeFinancementAction(fd)
    setEnvoi(false)
    if (r.success) setEnvoye(true)
    else setErreurEnvoi(r.error || 'Erreur')
  }

  const Pastille = ({ n }: { n: number }) => (
    <div className="flex items-center gap-2 mb-5">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= n ? 'w-8 bg-[#205040]' : 'w-4 bg-[#205040]/15'}`} />
      ))}
    </div>
  )

  if (envoye) {
    return (
      <div className="rounded-3xl bg-white ring-1 ring-black/5 p-8 md:p-10 text-center">
        <span className="mx-auto h-14 w-14 rounded-2xl bg-[#205040]/10 flex items-center justify-center"><CheckCircle2 className="h-7 w-7 text-[#205040]" /></span>
        <h3 className="mt-5 ll-display text-2xl text-[#14110F]">Demande envoyée</h3>
        <p className="mt-3 text-[#57534E] max-w-md mx-auto">
          Un conseiller vérifie votre prise en charge auprès de votre OPCO et revient vers vous
          sous 24 à 48 h ouvrées avec l&apos;étude complète.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-white ring-1 ring-black/5 p-6 md:p-8">
      <Pastille n={etape} />

      {etape === 1 && (
        <div>
          <h3 className="font-heading font-bold text-lg text-[#14110F]">Qui êtes-vous ?</h3>
          <p className="mt-1 text-sm text-[#57534E]">Entrez votre SIRET : on retrouve votre établissement et votre branche.</p>
          <div className="mt-4 flex gap-2">
            <input value={siret} onChange={(e) => setSiret(e.target.value)} inputMode="numeric"
              placeholder="N° SIRET (14 chiffres)"
              className="flex-1 rounded-xl border border-[#E7E5E4] px-4 py-3 text-sm focus:outline-none focus:border-[#205040]/50" />
            <button onClick={chercherSiret} disabled={chargeSiret}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#205040] text-white text-sm font-semibold hover:bg-[#123f34] disabled:opacity-50">
              {chargeSiret ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechercher'}
            </button>
          </div>
          {erreurSiret && <p className="mt-2 text-sm text-[#B45309]">{erreurSiret}</p>}
          {entreprise && (
            <div className="mt-4 rounded-2xl bg-[#205040]/5 border border-[#205040]/15 p-4 flex items-start gap-3">
              <Building2 className="h-5 w-5 text-[#205040] shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-[#14110F]">{entreprise.nom}</div>
                {entreprise.libelleNaf && <div className="text-[#57534E] mt-0.5">{entreprise.libelleNaf}</div>}
                {entreprise.brancheSuggeree && (
                  <div className="text-[#205040] mt-1 font-medium">
                    Branche détectée : {BAREMES_BRANCHES[entreprise.brancheSuggeree]?.label} ({BAREMES_BRANCHES[entreprise.brancheSuggeree]?.opco})
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => setEtape(2)} className="text-sm text-[#78716C] hover:text-[#14110F] transition-colors">
              Continuer sans SIRET
            </button>
            <button onClick={() => setEtape(2)} disabled={!entreprise}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#205040] text-white text-sm font-semibold hover:bg-[#123f34] disabled:opacity-40">
              Continuer <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {etape === 2 && (
        <div>
          <h3 className="font-heading font-bold text-lg text-[#14110F]">Votre activité</h3>
          <p className="mt-1 text-sm text-[#57534E]">Elle détermine votre OPCO et le barème de prise en charge.</p>
          <div className="mt-4 grid sm:grid-cols-2 gap-2.5">
            {BRANCHES.map((b) => (
              <button key={b.slug} onClick={() => { setBranche(b.slug); setFormationId(null) }}
                className={`text-left rounded-2xl border p-4 transition-colors ${
                  branche === b.slug ? 'border-[#205040] bg-[#205040]/5' : 'border-[#E7E5E4] hover:border-[#205040]/40'
                }`}>
                <div className="font-semibold text-sm text-[#14110F]">{b.label}</div>
                <div className="text-xs text-[#78716C] mt-0.5">OPCO : {b.opco}</div>
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => setEtape(1)} className="inline-flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#14110F]"><ArrowLeft className="h-4 w-4" /> Retour</button>
            <button onClick={() => setEtape(3)} disabled={!branche}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#205040] text-white text-sm font-semibold hover:bg-[#123f34] disabled:opacity-40">
              Continuer <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {etape === 3 && (
        <div>
          <h3 className="font-heading font-bold text-lg text-[#14110F]">Quelle formation ?</h3>
          <p className="mt-1 text-sm text-[#57534E]">Et pour combien de stagiaires.</p>
          <div className="mt-4 max-h-64 overflow-y-auto space-y-2 pr-1">
            {formationsBranche.map((f) => (
              <button key={f.id} onClick={() => setFormationId(f.id)}
                className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${
                  formationId === f.id ? 'border-[#205040] bg-[#205040]/5' : 'border-[#E7E5E4] hover:border-[#205040]/40'
                }`}>
                <div className="text-sm font-medium text-[#14110F]">{f.intitule}</div>
                <div className="text-xs text-[#78716C] mt-0.5">{[f.duree_heures ? `${f.duree_heures} h` : null, f.duree_jours ? `${f.duree_jours} j` : null].filter(Boolean).join(' · ')}</div>
              </button>
            ))}
            {formationsBranche.length === 0 && <p className="text-sm text-[#78716C] py-4 text-center">Choisissez d&apos;abord votre activité.</p>}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-[#57534E]">Stagiaires :</span>
            {[2, 4, 6, 8, 10].map((n) => (
              <button key={n} onClick={() => setStagiaires(n)}
                className={`h-9 w-9 rounded-full text-sm font-semibold transition-colors ${stagiaires === n ? 'bg-[#205040] text-white' : 'bg-[#205040]/8 text-[#205040] hover:bg-[#205040]/15'}`}>
                {n}
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => setEtape(2)} className="inline-flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#14110F]"><ArrowLeft className="h-4 w-4" /> Retour</button>
            <button onClick={() => setEtape(4)} disabled={!formationId}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#205040] text-white text-sm font-semibold hover:bg-[#123f34] disabled:opacity-40">
              Voir mon estimation <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {etape === 4 && (
        <div>
          <div className="grid sm:grid-cols-2 gap-2.5 mb-5">
            {[{ v: false, l: "Aucune formation cette année" }, { v: true, l: 'Déjà formé cette année' }].map((o) => (
              <button key={String(o.v)} onClick={() => setDejaForme(o.v)}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                  dejaForme === o.v ? 'border-[#205040] bg-[#205040]/5 text-[#14110F]' : 'border-[#E7E5E4] text-[#57534E] hover:border-[#205040]/40'
                }`}>
                {o.l}
              </button>
            ))}
          </div>

          {estimation && (
            <div className="rounded-2xl bg-[#205040] text-white p-6 md:p-7">
              <div className="flex items-center gap-2 text-white/70 text-sm"><Banknote className="h-4 w-4" /> Prise en charge estimée — {estimation.opco}</div>
              <div className="mt-2 ll-display text-3xl md:text-4xl">{estimation.texte}</div>
              <div className="mt-1.5 text-sm text-white/70">{estimation.detail}</div>
              <div className="mt-3 text-xs text-white/60">
                Estimation indicative d&apos;après les barèmes {estimation.opco} de votre branche
                {dejaForme ? ' — votre plafond annuel étant déjà entamé, nous vérifions le disponible restant auprès de votre OPCO' : ''}.
                Montant confirmé après instruction de votre dossier.
              </div>
            </div>
          )}

          <form onSubmit={envoyer} className="mt-5 space-y-3">
            <p className="text-sm font-medium text-[#14110F]">Recevez l&apos;étude détaillée — on vérifie votre prise en charge réelle auprès de votre OPCO :</p>
            <div className="grid sm:grid-cols-3 gap-2.5">
              <input name="nom" required placeholder="Votre nom" className="rounded-xl border border-[#E7E5E4] px-4 py-3 text-sm focus:outline-none focus:border-[#205040]/50" />
              <input name="email" type="email" placeholder="Email" className="rounded-xl border border-[#E7E5E4] px-4 py-3 text-sm focus:outline-none focus:border-[#205040]/50" />
              <input name="telephone" placeholder="Téléphone" className="rounded-xl border border-[#E7E5E4] px-4 py-3 text-sm focus:outline-none focus:border-[#205040]/50" />
            </div>
            {erreurEnvoi && <p className="text-sm text-[#B45309]">{erreurEnvoi}</p>}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setEtape(3)} className="inline-flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#14110F]"><ArrowLeft className="h-4 w-4" /> Retour</button>
              <button type="submit" disabled={envoi}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#205040] text-white text-sm font-semibold hover:bg-[#123f34] disabled:opacity-50">
                {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Recevoir mon étude gratuite <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-[#A8A29E]">Vos coordonnées servent uniquement à vous répondre — aucune diffusion.</p>
          </form>
        </div>
      )}
    </div>
  )
}
