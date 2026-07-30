import Link from 'next/link'
import { Mail, ShieldCheck } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="bg-[#14110F] text-[#E7E5E4]">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="mb-3">
            <img src="/logo-lablearning.svg" alt="Lab Learning" className="h-9 w-auto brightness-0 invert opacity-90" />
          </div>
          <p className="text-sm text-[#A8A29E] max-w-sm leading-relaxed">
            Organisme de formation professionnelle certifié Qualiopi, spécialiste des métiers de bouche
            et de la performance en restauration.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#8ec9b8]">
            <ShieldCheck className="h-4 w-4" /> Certifié Qualiopi
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">Navigation</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/site" className="text-[#D6D3D1] hover:text-white">Accueil</Link></li>
            <li><Link href="/site/formations" className="text-[#D6D3D1] hover:text-white">Nos formations</Link></li>
            <li><Link href="/site/financements" className="text-[#D6D3D1] hover:text-white">Financements</Link></li>
            <li><Link href="/site/equipe" className="text-[#D6D3D1] hover:text-white">Notre équipe</Link></li>
            <li><Link href="/site/a-propos" className="text-[#D6D3D1] hover:text-white">À propos</Link></li>
            <li><Link href="/site/contact" className="text-[#D6D3D1] hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">Contact</div>
          <a href="mailto:digital@lab-learning.fr" className="inline-flex items-center gap-2 text-sm text-[#D6D3D1] hover:text-white">
            <Mail className="h-4 w-4" /> digital@lab-learning.fr
          </a>
          <p className="text-xs text-[#78716C] mt-4">Financements OPCO · France Travail · Plan de développement des compétences</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 text-xs text-[#78716C] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {'{année}'.replace('{année}', String(new Date().getFullYear()))} Lab Learning. Tous droits réservés.</span>
          <span>Restauration · Boucherie · Boulangerie · Pâtisserie · Hôtellerie</span>
        </div>
      </div>
    </footer>
  )
}
