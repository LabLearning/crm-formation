'use client'

// Démo scriptée de Starkk : le visiteur clique une question, la réponse se
// tape en direct avec les cartes de l'interface (document, action à confirmer).
// Données fictives, aucun appel réseau.
import { useEffect, useRef, useState } from 'react'
import { FileCheck2, CheckCircle2, ArrowRight } from '../icons'

type Carte =
  | { type: 'document'; nom: string; meta: string }
  | { type: 'action'; titre: string; details: string[]; fait: string }

type Scenario = {
  question: string
  profil: string
  reponse: string
  carte?: Carte
}

const SCENARIOS: Scenario[] = [
  {
    question: 'Où en est ma session de mardi ?',
    profil: 'Gérant',
    reponse:
      'Votre session Hygiène alimentaire de mardi est confirmée : 5 stagiaires inscrits, formateur affecté, de 10h à 18h dans votre établissement. Il manque encore 2 signatures d’émargement, je peux préparer les relances si vous le souhaitez.',
  },
  {
    question: 'Renvoie-moi mon attestation',
    profil: 'Apprenant',
    reponse: 'La voici. Elle reprend vos 14 heures de formation validées les 12 et 13 mai.',
    carte: { type: 'document', nom: 'Attestation de formation - Hygiène alimentaire.pdf', meta: 'PDF · 14 h · signée' },
  },
  {
    question: 'Explique-moi la question que j’ai ratée',
    profil: 'Apprenant',
    reponse:
      'Question 7 : vous avez indiqué que la zone de danger bactérienne commence à 0 °C. En réalité, elle se situe entre +4 °C et +63 °C : c’est dans cette plage que les bactéries se multiplient le plus vite. En dessous de +4 °C, le froid ralentit leur développement. C’est pour cela qu’on ne laisse jamais un produit sensible plus de 2 heures à température ambiante. Plus clair ?',
  },
  {
    question: 'Relance les questionnaires de satisfaction',
    profil: 'Formateur',
    reponse: 'Sur votre session du 12 mai, 4 stagiaires n’ont pas encore répondu. Voici ce que je vous propose :',
    carte: {
      type: 'action',
      titre: 'Relancer 4 questionnaires de satisfaction',
      details: ['Session Hygiène alimentaire du 12 mai', 'Email de relance personnalisé à chaque stagiaire', 'Aucun envoi aux 3 stagiaires ayant déjà répondu'],
      fait: '4 relances envoyées. Je vous préviens dès la première réponse.',
    },
  },
]

type Message =
  | { de: 'visiteur'; texte: string }
  | { de: 'starkk'; texte: string; complet: boolean; carte?: Carte; carteVisible?: boolean; confirme?: boolean }

export function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([])
  const [posees, setPosees] = useState<number[]>([])
  const [occupe, setOccupe] = useState(false)
  const zone = useRef<HTMLDivElement>(null)

  useEffect(() => {
    zone.current?.scrollTo({ top: zone.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const poser = (idx: number) => {
    if (occupe || posees.includes(idx)) return
    const s = SCENARIOS[idx]
    setOccupe(true)
    setPosees((p) => [...p, idx])
    setMessages((m) => [...m, { de: 'visiteur', texte: s.question }])

    setTimeout(() => {
      setMessages((m) => [...m, { de: 'starkk', texte: '', complet: false, carte: s.carte }])
      let pos = 0
      const tick = () => {
        pos = Math.min(pos + 2 + Math.floor(Math.random() * 3), s.reponse.length)
        const texte = s.reponse.slice(0, pos)
        const fini = pos >= s.reponse.length
        setMessages((m) => {
          const copie = [...m]
          const dernier = copie[copie.length - 1]
          if (dernier.de === 'starkk') copie[copie.length - 1] = { ...dernier, texte, complet: fini }
          return copie
        })
        if (!fini) setTimeout(tick, 28)
        else {
          if (s.carte) {
            setTimeout(() => {
              setMessages((m) => {
                const copie = [...m]
                const dernier = copie[copie.length - 1]
                if (dernier.de === 'starkk') copie[copie.length - 1] = { ...dernier, carteVisible: true }
                return copie
              })
              setOccupe(false)
            }, 350)
          } else setOccupe(false)
        }
      }
      setTimeout(tick, 500)
    }, 600)
  }

  const confirmer = (idxMessage: number) => {
    setMessages((m) => m.map((msg, i) => (i === idxMessage && msg.de === 'starkk' ? { ...msg, confirme: true } : msg)))
  }

  const rejouer = () => { setMessages([]); setPosees([]); setOccupe(false) }
  const restantes = SCENARIOS.map((s, i) => ({ s, i })).filter(({ i }) => !posees.includes(i))

  return (
    <div className="rounded-[28px] bg-[#0C1210] ring-1 ring-black/20 shadow-2xl shadow-black/20 overflow-hidden">
      {/* En-tête du chat */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <img src="/starkk.png" alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-[#5CD9A0]/40" />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">Starkk</div>
          <div className="text-[11px] text-[#5CD9A0] flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#5CD9A0]" /> En ligne</div>
        </div>
        <span className="ml-auto text-[11px] uppercase tracking-wide text-white/40">Démonstration</span>
      </div>

      {/* Fil de messages */}
      <div ref={zone} className="h-[340px] md:h-[380px] overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-white/40 text-center pt-24">Choisissez une question ci-dessous pour voir Starkk répondre.</p>
        )}
        {messages.map((msg, i) =>
          msg.de === 'visiteur' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#5CD9A0] text-[#0C1210] text-sm px-4 py-2.5 font-medium">{msg.texte}</div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2.5">
              <img src="/starkk.png" alt="" className="h-7 w-7 rounded-full object-cover mt-0.5 shrink-0" />
              <div className="max-w-[85%] space-y-2.5">
                <div className="rounded-2xl rounded-bl-md bg-white/[0.07] ring-1 ring-white/10 text-sm text-white/85 px-4 py-2.5 leading-relaxed">
                  {msg.texte || <span className="inline-flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" /><span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:120ms]" /><span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:240ms]" /></span>}
                  {!msg.complet && msg.texte && <span className="inline-block w-[7px] h-[1em] align-text-bottom bg-[#5CD9A0] ml-0.5 animate-pulse" />}
                </div>

                {msg.carteVisible && msg.carte?.type === 'document' && (
                  <div className="flex items-center gap-3 rounded-2xl bg-white/[0.07] ring-1 ring-[#5CD9A0]/30 px-4 py-3 ll-rise">
                    <span className="h-9 w-9 shrink-0 rounded-xl bg-[#5CD9A0]/15 flex items-center justify-center"><FileCheck2 className="h-5 w-5 text-[#5CD9A0]" /></span>
                    <div className="leading-tight min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate">{msg.carte.nom}</div>
                      <div className="text-[11px] text-white/45 mt-0.5">{msg.carte.meta}</div>
                    </div>
                  </div>
                )}

                {msg.carteVisible && msg.carte?.type === 'action' && (
                  <div className="rounded-2xl bg-white/[0.07] ring-1 ring-[#5CD9A0]/30 p-4 ll-rise">
                    <div className="text-[13px] font-semibold text-white">{msg.carte.titre}</div>
                    <ul className="mt-2 space-y-1">
                      {msg.carte.details.map((d) => (
                        <li key={d} className="flex items-start gap-1.5 text-[12px] text-white/55"><CheckCircle2 className="h-3.5 w-3.5 mt-[1px] shrink-0 text-[#5CD9A0]" /> {d}</li>
                      ))}
                    </ul>
                    {msg.confirme ? (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#5CD9A0]/15 px-3 py-1.5 text-xs font-semibold text-[#5CD9A0]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {msg.carte.fait}
                      </div>
                    ) : (
                      <button onClick={() => confirmer(i)} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#5CD9A0] text-[#0C1210] px-4 py-1.5 text-xs font-semibold hover:bg-[#38C588] transition-colors">
                        Confirmer l’envoi <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Questions suggérées */}
      <div className="px-5 py-4 border-t border-white/10">
        {restantes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {restantes.map(({ s, i }) => (
              <button key={i} onClick={() => poser(i)} disabled={occupe}
                className="rounded-full border border-white/15 px-3.5 py-2 text-[13px] text-white/75 hover:border-[#5CD9A0]/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 text-left">
                <span className="text-[#5CD9A0] mr-1.5 text-[11px] uppercase tracking-wide">{s.profil}</span>{s.question}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={rejouer} className="text-[13px] text-[#5CD9A0] font-semibold hover:underline">Rejouer la démonstration</button>
        )}
      </div>
    </div>
  )
}
