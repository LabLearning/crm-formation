import { Mail, ShieldCheck, Banknote, Clock } from '../icons'
import { ContactForm } from './ContactForm'

export const metadata = { title: 'Contact — Lab Learning' }

export default function SiteContact() {
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-20">
      <div className="text-xs font-semibold uppercase tracking-wider text-[#195144] mb-2">Contact</div>
      <h1 className="font-heading font-black text-4xl md:text-5xl text-[#14110F] tracking-heading text-balance max-w-3xl">Parlons de votre projet de formation</h1>
      <p className="mt-4 text-lg text-[#57534E] max-w-2xl">
        Un besoin précis, une équipe à former, un financement à monter ? Écrivez-nous — nous revenons vers vous rapidement.
      </p>

      <div className="mt-12 grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3">
          <div className="rounded-3xl border border-[#195144]/10 bg-white p-6 md:p-8">
            <ContactForm />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <a href="mailto:digital@lab-learning.fr" className="flex items-start gap-3 rounded-2xl border border-[#195144]/10 bg-white p-5 hover:border-[#195144]/30 transition-colors">
            <span className="h-10 w-10 rounded-xl bg-[#195144]/8 flex items-center justify-center shrink-0"><Mail className="h-5 w-5 text-[#195144]" /></span>
            <span><span className="block font-heading font-semibold text-[#14110F]">Email</span><span className="text-sm text-[#57534E]">digital@lab-learning.fr</span></span>
          </a>
          {[
            { Icon: ShieldCheck, t: 'Certifié Qualiopi', d: 'Actions de formation conformes aux exigences qualité.' },
            { Icon: Banknote, t: 'Financements', d: 'OPCO, France Travail, plan de développement des compétences.' },
            { Icon: Clock, t: 'Réactivité', d: 'Réponse sous 24 à 48 h ouvrées, sessions planifiées rapidement.' },
          ].map((x) => (
            <div key={x.t} className="flex items-start gap-3 rounded-2xl border border-[#195144]/10 bg-white p-5">
              <span className="h-10 w-10 rounded-xl bg-[#195144]/8 flex items-center justify-center shrink-0"><x.Icon className="h-5 w-5 text-[#195144]" /></span>
              <span><span className="block font-heading font-semibold text-[#14110F]">{x.t}</span><span className="text-sm text-[#57534E]">{x.d}</span></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
