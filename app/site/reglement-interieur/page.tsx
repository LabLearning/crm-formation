import { LegalPage } from '../LegalPage'

export const metadata = { title: 'Règlement intérieur — Lab Learning' }

/**
 * Règlement intérieur applicable aux stagiaires (articles L6352-3 à L6352-5 et
 * R6352-1 à R6352-15 du code du travail).
 *
 * Publié sur le site : la remise au stagiaire suppose que le document soit
 * accessible avant l'entrée en formation, et l'indicateur 9 du RNQ contrôle
 * précisément cette diffusion. Les articles 3 à 6 portent les mentions
 * introduites par la loi n° 2026-534 du 25 juin 2026 — traitement égal,
 * liberté d'expression et de conscience, neutralité des enseignements.
 */
export default function ReglementInterieur() {
  return (
    <LegalPage title="Règlement intérieur applicable aux stagiaires" updated="août 2026">
      <h2>I — Préambule</h2>
      <p>
        Le présent règlement intérieur précise les dispositions s&apos;appliquant à tous les inscrits et
        participants aux formations organisées par <strong>Lab Learning</strong> (SAS, 6b boulevard
        Berthelot, 34000 Montpellier — organisme de formation enregistré sous le n° 76 34 13151 34),
        dans le but de permettre un fonctionnement régulier des formations proposées.
      </p>

      <h2>Article 1 — Objet</h2>
      <p>
        <strong>Version 2 — mise à jour le 16 août 2026</strong>, à la suite de la veille légale sur les
        organismes de formation (loi n° 2026-534 du 25 juin 2026 et article L.6352-4 modifié du code du
        travail) ; annule et remplace la version précédente.
        {' '}Le présent règlement est établi conformément aux dispositions des articles L.6352-3 à L.6352-5
        et R.6352-1 à R.6352-15 du code du travail. Il s&apos;applique à tous les bénéficiaires de la
        formation, pour la durée de la formation suivie. Il définit les règles générales et permanentes,
        précise la réglementation en matière d&apos;hygiène et de sécurité ainsi que les règles relatives
        à la discipline, notamment les sanctions applicables aux stagiaires et leurs droits en cas de
        sanction.
      </p>

      <h2>Article 2 — Personnes concernées</h2>
      <p>
        Le présent règlement s&apos;applique à tous les bénéficiaires inscrits à une session dispensée
        par Lab Learning, pour toute la durée de la formation suivie. Ses dispositions valent dans
        l&apos;établissement proprement dit comme dans tout local ou espace accessoire, en particulier
        pour les formations dispensées en dehors de l&apos;établissement. Lorsque l&apos;entreprise ou
        l&apos;établissement d&apos;accueil est doté de son propre règlement intérieur, les mesures de
        santé et de sécurité applicables aux stagiaires sont celles de ce dernier.
      </p>
      <p>
        Chaque bénéficiaire est considéré comme ayant accepté les termes du présent règlement
        lorsqu&apos;il suit une formation dispensée par Lab Learning, et accepte que des mesures soient
        prises à son égard en cas d&apos;inobservation.
      </p>

      <h2>Article 3 — Égalité de traitement des stagiaires</h2>
      <p>
        Conformément à l&apos;article L.6352-4 du code du travail, Lab Learning assure le traitement
        égal de l&apos;ensemble des stagiaires et apprentis tout au long de leur parcours. Les modalités
        d&apos;accès, d&apos;accompagnement, d&apos;évaluation et de participation à la formation sont
        mises en œuvre dans le respect du principe d&apos;égalité de traitement.
      </p>

      <h2>Article 4 — Respect de la liberté d&apos;expression</h2>
      <p>
        Lab Learning veille au respect de la liberté d&apos;expression des stagiaires. Les échanges
        intervenant dans le cadre de la formation doivent toutefois demeurer compatibles avec le bon
        déroulement des enseignements, le respect des personnes présentes et les dispositions du
        présent règlement.
      </p>

      <h2>Article 5 — Respect de la liberté de conscience</h2>
      <p>
        Lab Learning garantit le respect de la liberté de conscience des stagiaires. Aucun enseignement
        ni aucune pratique mis en œuvre dans le cadre de la formation n&apos;a pour objet
        d&apos;influencer les convictions personnelles, philosophiques, religieuses ou politiques des
        participants.
      </p>

      <h2>Article 6 — Neutralité des enseignements</h2>
      <p>
        Les enseignements dispensés sont assurés dans le respect du principe de neutralité prévu à
        l&apos;article L.6352-4 du code du travail. Les contenus pédagogiques sont exclusivement
        destinés à l&apos;acquisition des compétences et à l&apos;atteinte des objectifs de la
        formation ; ils sont dispensés sans considération des opinions ou convictions personnelles des
        stagiaires.
      </p>

      <h2>Article 7 — Lieu de la formation</h2>
      <p>
        Les formations ont lieu dans des locaux extérieurs ou au sein de ceux du client. Dans ce second
        cas, le client a pris connaissance des moyens requis pour la formation, remis en amont par
        Lab Learning afin d&apos;en garantir le bon déroulement. Les dispositions du présent règlement
        sont applicables dans tout local destiné à recevoir des formations.
      </p>
      <p>Pour les sessions à distance, il est formellement interdit aux stagiaires :</p>
      <ul>
        <li>de se présenter aux formations en état d&apos;ébriété ;</li>
        <li>d&apos;utiliser les téléphones mobiles durant les sessions ;</li>
        <li>de s&apos;absenter sans motif lors d&apos;une visioconférence.</li>
      </ul>
      <p>
        Les stagiaires s&apos;engagent également à respecter les conditions d&apos;utilisation de
        l&apos;outil de visioconférence employé (Google Meet).
      </p>

      <h2>Article 8 — Représentation des stagiaires</h2>
      <p>
        Dans les stages d&apos;une durée supérieure à 200 heures, il est procédé simultanément à
        l&apos;élection d&apos;un délégué titulaire et d&apos;un délégué suppléant au scrutin uninominal
        à deux tours. Tous les stagiaires sont électeurs et éligibles ; le scrutin a lieu pendant les
        heures de formation, au plus tôt vingt heures et au plus tard quarante heures après le début du
        stage. Le responsable de l&apos;organisme a la charge de l&apos;organisation du scrutin et en
        assure le bon déroulement ; il adresse un procès-verbal de carence au préfet de région
        territorialement compétent lorsque la représentation ne peut être assurée. Les délégués sont
        élus pour la durée du stage.
      </p>

      <h2>II — Hygiène et sécurité</h2>

      <h2>Article 9 — Locaux</h2>
      <p>
        La prévention des risques d&apos;accident et de maladie est impérative et exige de chacun le
        respect total des prescriptions applicables en matière d&apos;hygiène et de sécurité. Les
        consignes générales et particulières de sécurité en vigueur dans l&apos;organisme, lorsqu&apos;elles
        existent, doivent être strictement respectées sous peine de sanctions disciplinaires. Pour les
        stages effectués hors des locaux de Lab Learning, les stagiaires sont tenus de respecter les
        consignes d&apos;hygiène et de sécurité du lieu où se déroule le stage.
      </p>

      <h2>Article 10 — Accident</h2>
      <p>
        Tout accident ou incident survenu à l&apos;occasion ou en cours de formation doit être
        immédiatement déclaré par le stagiaire accidenté ou les témoins au responsable de
        l&apos;organisme. L&apos;accident survenu au stagiaire pendant qu&apos;il se trouve sur le lieu
        de formation, ou pendant qu&apos;il s&apos;y rend ou en revient, fait l&apos;objet d&apos;une
        déclaration par le responsable de l&apos;organisme auprès de la caisse de sécurité sociale.
      </p>

      <h2>Article 11 — Consignes d&apos;incendie</h2>
      <p>
        Les consignes d&apos;incendie, et notamment un plan de localisation des extincteurs et des
        issues de secours, sont affichées dans les locaux de formation de manière à être connues de
        tous les stagiaires.
      </p>

      <h2>III — Discipline générale</h2>

      <h2>Article 12 — Interdictions</h2>
      <p>Il est formellement interdit aux stagiaires :</p>
      <ul>
        <li>de fumer dans les locaux, sauf aménagement spécial à cet effet ;</li>
        <li>d&apos;entrer sur le lieu de stage en état d&apos;ivresse ;</li>
        <li>d&apos;introduire des boissons alcoolisées dans les locaux ;</li>
        <li>de quitter le stage sans motif ou sans avertir les responsables ;</li>
        <li>d&apos;emporter un objet sans autorisation écrite ;</li>
        <li>de manifester tout comportement de type harcèlement, sexuel ou autre, envers quiconque.</li>
      </ul>

      <h2>Article 13 — Horaires de stage</h2>
      <p>
        Les horaires de stage sont fixés par Lab Learning et portés à la connaissance des stagiaires
        par la convocation adressée par voie électronique. Les stagiaires sont tenus de les respecter.
        Lab Learning se réserve, dans les limites imposées par les dispositions en vigueur, le droit de
        modifier les horaires en fonction des nécessités de service. En cas d&apos;absence ou de
        retard, le stagiaire avertit l&apos;organisme et le formateur. Une feuille de présence doit être
        signée par le stagiaire.
      </p>

      <h2>Article 14 — Accès au lieu de formation</h2>
      <p>
        Sauf autorisation expresse de Lab Learning, les stagiaires ne peuvent entrer ou demeurer sur le
        lieu de formation à d&apos;autres fins que le suivi de leur stage, ni faciliter
        l&apos;introduction de tierces personnes.
      </p>

      <h2>Article 15 — Usage du matériel</h2>
      <p>
        Chaque stagiaire conserve en bon état le matériel qui lui est confié en vue de sa formation et
        l&apos;utilise conformément à son objet. À la fin du stage, il restitue tout matériel et
        document appartenant à l&apos;organisme, à l&apos;exception des documents pédagogiques
        distribués en cours de formation.
      </p>

      <h2>Article 16 — Enregistrements</h2>
      <p>
        Il est formellement interdit, sauf dérogation expresse, d&apos;enregistrer ou de filmer les
        sessions de formation.
      </p>

      <h2>Article 17 — Documentation pédagogique</h2>
      <p>
        La documentation pédagogique remise lors des sessions est protégée au titre du droit
        d&apos;auteur et ne peut être réutilisée autrement que pour un strict usage personnel.
      </p>

      <h2>Article 18 — Biens personnels</h2>
      <p>
        Lab Learning décline toute responsabilité en cas de perte, vol ou détérioration des objets
        personnels de toute nature déposés par les stagiaires dans les locaux de formation.
      </p>

      <h2>IV — Sanctions</h2>

      <h2>Article 19 — Nature des sanctions</h2>
      <p>
        Tout agissement considéré comme fautif pourra, en fonction de sa nature et de sa gravité,
        faire l&apos;objet de l&apos;une des sanctions suivantes, classées par ordre d&apos;importance :
        avertissement écrit, blâme, exclusion définitive de la formation.
      </p>

      <h2>Article 20 — Prononcé des sanctions</h2>
      <p>
        La direction de Lab Learning est seule habilitée à décider de la sanction. Elle s&apos;engage à
        aviser l&apos;employeur et, le cas échéant, l&apos;organisme paritaire prenant en charge les
        frais de formation.
      </p>

      <h2>V — Droit d&apos;auteur</h2>
      <p>
        Les supports de cours mis à disposition dans le cadre de la formation restent la propriété de
        Lab Learning et de leurs auteurs. Les usagers s&apos;interdisent toute reproduction ou
        réutilisation, totale ou partielle, à toutes fins de diffusion interne ou externe, à titre
        onéreux ou gracieux, quelles qu&apos;en soient les modalités.
      </p>

      <p>
        <strong>Lab Learning</strong> — Julien COLELLA, Président.<br />
        Fait à Montpellier — applicable à compter d&apos;août 2026.
      </p>
    </LegalPage>
  )
}
