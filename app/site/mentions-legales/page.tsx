import { LegalPage } from '../LegalPage'

export const metadata = { title: 'Mentions légales — Lab Learning' }

export default function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales" updated="août 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le présent site est édité par <strong>Lab Learning</strong>, société par actions simplifiée (SAS)
        au capital de 5 000 €.
      </p>
      <ul>
        <li><strong>Siège social :</strong> 6b boulevard Berthelot, Bureau 3, 34000 Montpellier</li>
        <li><strong>SIRET :</strong> 931 658 561 00036</li>
        <li><strong>TVA intracommunautaire :</strong> FR41931658561</li>
        <li><strong>Représentant légal :</strong> Julien MACHADO</li>
        <li><strong>Téléphone :</strong> 06 95 33 11 24</li>
        <li><strong>Email :</strong> <a href="mailto:contact@lab-learning.fr">contact@lab-learning.fr</a></li>
      </ul>

      <h2>Organisme de formation</h2>
      <p>
        Lab Learning est enregistré comme organisme de formation sous le numéro de déclaration d’activité
        <strong> 76 34 13151 34</strong> auprès du Préfet de la région Occitanie. Cet enregistrement ne vaut pas
        agrément de l’État.
      </p>
      <p>
        Lab Learning est <strong>certifié Qualiopi</strong> au titre de la catégorie « Actions de formation »,
        et inscrit sur la liste officielle de la <strong>DRAAF</strong> pour dispenser la formation en hygiène
        alimentaire (HACCP).
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <strong>IONOS SARL</strong> — 7 place de la Gare, 57200 Sarreguemines —
        Téléphone : 0970 808 911 — <a href="https://www.ionos.fr" target="_blank" rel="noopener noreferrer">www.ionos.fr</a>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L’ensemble des contenus du site (textes, visuels, logos, marques, mise en page) est la propriété exclusive
        de Lab Learning ou de ses partenaires, et est protégé par le droit de la propriété intellectuelle. Toute
        reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable, est interdite.
      </p>

      <h2>Données personnelles &amp; cookies</h2>
      <p>
        Le traitement de vos données personnelles est décrit dans notre
        {' '}<a href="/site/confidentialite">politique de confidentialité</a>. L’usage des cookies est détaillé dans notre
        {' '}<a href="/site/cookies">politique de gestion des cookies</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative au site ou à nos formations : <a href="mailto:contact@lab-learning.fr">contact@lab-learning.fr</a>.
      </p>
    </LegalPage>
  )
}
