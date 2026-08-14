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
          {/*
            Règle d'usage de la marque Qualiopi : le logo ne s'affiche jamais
            sans la mention de la catégorie d'action, dans le même bloc.
          */}
          <div className="mt-5 max-w-sm rounded-2xl bg-white p-4">
            <img src="/site/logos/qualiopi.png" alt="Qualiopi — processus certifié — République française" className="h-12 w-auto" />
            <p className="mt-3 text-[12px] leading-relaxed text-[#44403C]">
              La certification qualité a été délivrée au titre de la catégorie d&apos;action suivante :
              <br /><strong className="text-[#14110F]">ACTIONS DE FORMATION</strong>
            </p>
            <a href="/site/documents/certificat-qualiopi-lab-learning.pdf" target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-block text-[12px] font-semibold text-[#195144] underline underline-offset-2 hover:text-[#123f34]">
              Consulter notre certificat (PDF)
            </a>
          </div>
          <p className="mt-3 text-[11px] text-[#78716C] max-w-sm leading-relaxed">
            Certificat n° CERT_S1024_0345_1 délivré par CEVA SOLUTION, valable jusqu&apos;au 04/11/2027.
            Inscrit sur la liste de la DRAAF pour la formation hygiène alimentaire (HACCP).
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-3">Navigation</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/site" className="text-[#D6D3D1] hover:text-white">Accueil</Link></li>
            <li><Link href="/site/formations" className="text-[#D6D3D1] hover:text-white">Nos formations</Link></li>
            <li><Link href="/site/financements" className="text-[#D6D3D1] hover:text-white">Financements</Link></li>
            <li><Link href="/site/partenaires" className="text-[#D6D3D1] hover:text-white">Clients</Link></li>
            <li><Link href="/site/resultats" className="text-[#D6D3D1] hover:text-white">Nos résultats</Link></li>
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
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" /> 6b boulevard Berthelot, Bureau 3, 34000 Montpellier
            </div>
          </div>
          <p className="text-xs text-[#78716C] mt-4">Financements OPCO · France Travail · Plan de développement des compétences</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 space-y-2 text-xs text-[#78716C]">
          <p className="leading-relaxed">
            Lab Learning — SAS au capital de 5 000 € · SIRET 931 658 561 00036 · Déclaration d’activité n° 76 34 13151 34
            (cet enregistrement ne vaut pas agrément de l’État) · TVA FR41931658561
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/site/mentions-legales" className="hover:text-[#D6D3D1]">Mentions légales</Link>
            <Link href="/site/cgv" className="hover:text-[#D6D3D1]">CGV</Link>
            <Link href="/site/reglement-interieur" className="hover:text-[#D6D3D1]">Règlement intérieur</Link>
            <Link href="/site/reclamation" className="hover:text-[#D6D3D1]">Réclamations</Link>
            <Link href="/site/confidentialite" className="hover:text-[#D6D3D1]">Confidentialité</Link>
            <Link href="/site/cookies" className="hover:text-[#D6D3D1]">Cookies</Link>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>© {'{année}'.replace('{année}', String(new Date().getFullYear()))} Lab Learning. Tous droits réservés.</span>
            <span>Restauration · Boucherie · Boulangerie · Pâtisserie · Hôtellerie</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
