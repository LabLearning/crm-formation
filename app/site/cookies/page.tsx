import { LegalPage } from '../LegalPage'

export const metadata = { title: 'Politique de gestion des cookies — Lab Learning' }

export default function Cookies() {
  return (
    <LegalPage title="Politique de gestion des cookies" updated="août 2026">
      <p>
        Un cookie est un petit fichier déposé sur votre terminal lors de la visite d’un site. Cette politique explique
        quels cookies nous utilisons et comment les gérer.
      </p>

      <h2>Cookies utilisés</h2>
      <ul>
        <li><strong>Cookies strictement nécessaires</strong> — indispensables au fonctionnement du site (navigation,
          sécurité). Ils ne requièrent pas votre consentement.</li>
        <li><strong>Cookies de mesure d’audience</strong> — nous aident à comprendre l’utilisation du site pour
          l’améliorer. Déposés uniquement avec votre consentement.</li>
      </ul>

      <h2>Consentement</h2>
      <p>
        Lors de votre première visite, vous pouvez accepter ou refuser les cookies non essentiels. Vous pouvez modifier
        votre choix à tout moment via les paramètres de votre navigateur.
      </p>

      <h2>Gérer les cookies</h2>
      <p>
        Vous pouvez configurer votre navigateur pour bloquer ou supprimer les cookies. Le blocage de certains cookies
        peut toutefois affecter votre expérience de navigation. La procédure varie selon le navigateur (Chrome, Firefox,
        Safari, Edge) — consultez la rubrique d’aide de votre navigateur.
      </p>

      <h2>En savoir plus</h2>
      <p>
        Pour toute question relative aux cookies ou à vos données : <a href="mailto:dpo@lab-learning.fr">dpo@lab-learning.fr</a>.
        Voir aussi notre <a href="/site/confidentialite">politique de confidentialité</a>.
      </p>
    </LegalPage>
  )
}
