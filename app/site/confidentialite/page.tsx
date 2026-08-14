import { LegalPage } from '../LegalPage'

export const metadata = { title: 'Politique de confidentialité — Lab Learning' }

export default function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité" updated="août 2026">
      <p>
        Lab Learning accorde une grande importance à la protection de vos données personnelles. La présente politique
        décrit comment nous collectons, utilisons et protégeons vos données, conformément au Règlement Général sur la
        Protection des Données (RGPD) et à la loi Informatique et Libertés.
      </p>

      <h2>Responsable de traitement</h2>
      <p>
        Lab Learning, SAS — 6b boulevard Berthelot, Bureau 3, 34000 Montpellier. Contact : <a href="mailto:contact@lab-learning.fr">contact@lab-learning.fr</a>.
        Délégué à la protection des données (DPO) : <a href="mailto:dpo@lab-learning.fr">dpo@lab-learning.fr</a>.
      </p>

      <h2>Données collectées</h2>
      <p>Selon votre interaction avec nous, nous pouvons collecter :</p>
      <ul>
        <li>Identité et coordonnées (nom, prénom, email, téléphone, entreprise) ;</li>
        <li>Informations relatives à votre demande de formation ou de financement ;</li>
        <li>Données de navigation (via les cookies — voir notre <a href="/site/cookies">politique cookies</a>).</li>
      </ul>

      <h2>Finalités &amp; bases légales</h2>
      <ul>
        <li><strong>Répondre à vos demandes</strong> (formulaire de contact) — intérêt légitime / mesures précontractuelles ;</li>
        <li><strong>Gérer les inscriptions et le suivi des formations</strong> — exécution du contrat ;</li>
        <li><strong>Respecter nos obligations</strong> (Qualiopi, comptables, légales) — obligation légale ;</li>
        <li><strong>Amélioration du site et statistiques</strong> — consentement / intérêt légitime.</li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>
        Vos données sont conservées pour la durée nécessaire aux finalités poursuivies, puis archivées ou supprimées
        conformément aux obligations légales (notamment la durée de conservation des documents de formation et
        comptables).
      </p>

      <h2>Destinataires</h2>
      <p>
        Vos données sont destinées aux services habilités de Lab Learning et, le cas échéant, à nos sous-traitants
        (hébergeur, outils de gestion) et partenaires strictement nécessaires (financeurs, OPCO), dans le respect de
        la confidentialité. Elles ne sont jamais vendues à des tiers.
      </p>

      <h2>Vos droits</h2>
      <p>Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité
        de vos données. Pour les exercer : <a href="mailto:dpo@lab-learning.fr">dpo@lab-learning.fr</a>.</p>
      <p>
        Vous pouvez également introduire une réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
      </p>

      <h2>Sécurité</h2>
      <p>
        Lab Learning met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données
        contre tout accès, altération ou divulgation non autorisés.
      </p>
    </LegalPage>
  )
}
