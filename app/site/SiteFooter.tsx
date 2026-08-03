import Link from 'next/link'
import { Mail, PhoneCall, MapPin } from './icons'

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
          <div className="mt-5 flex items-center gap-3">
            <span className="rounded-lg bg-white px-2.5 py-2 inline-flex items-center">
              <img src="/site/logos/qualiopi.png" alt="Certifié Qualiopi — Actions de formation" className="h-10 w-auto" />
            </span>
          </div>
          <p className="mt-3 text-[11px] text-[#78716C] max-w-sm leading-relaxed">
            Certification qualité délivrée au titre des actions de formation. Inscrit sur la liste de la DRAAF pour la formation hygiène alimentaire (HACCP).
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">Navigation</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/site" className="text-[#D6D3D1] hover:text-white">Accueil</Link></li>
            <li><Link href="/site/formations" className="text-[#D6D3D1] hover:text-white">Nos formations</Link></li>
            <li><Link href="/site/financements" className="text-[#D6D3D1] hover:text-white">Financements</Link></li>
            <li><Link href="/site/partenaires" className="text-[#D6D3D1] hover:text-white">Partenaires</Link></li>
            <li><Link href="/site/a-propos" className="text-[#D6D3D1] hover:text-white">À propos</Link></li>
            <li><Link href="/site/contact" className="text-[#D6D3D1] hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">Contact</div>
          <div className="space-y-2 text-sm">
            <a href="mailto:contact@lab-learning.fr" className="flex items-center gap-2 text-[#D6D3D1] hover:text-white">
              <Mail className="h-4 w-4 shrink-0" /> contact@lab-learning.fr
            </a>
            <a href="tel:+33695331124" className="flex items-center gap-2 text-[#D6D3D1] hover:text-white">
              <PhoneCall className="h-4 w-4 shrink-0" /> 06 95 33 11 24
            </a>
            <div className="flex items-start gap-2 text-[#D6D3D1]">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" /> 7 rue de l’Opale, 34070 Montpellier
            </div>
          </div>
          <p className="text-xs text-[#78716C] mt-4">Financements OPCO · France Travail · Plan de développement des compétences</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 space-y-2 text-xs text-[#78716C]">
          <p className="leading-relaxed">
            Lab Learning — SAS au capital de 5 000 € · SIRET 931 658 561 000 10 · Déclaration d’activité n° 76 34 13151 34
            (cet enregistrement ne vaut pas agrément de l’État) · TVA FR41931658561
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>© {'{année}'.replace('{année}', String(new Date().getFullYear()))} Lab Learning. Tous droits réservés.</span>
            <span>Restauration · Boucherie · Boulangerie · Pâtisserie · Hôtellerie</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
