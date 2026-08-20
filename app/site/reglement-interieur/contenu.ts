/**
 * Règlement intérieur applicable aux stagiaires — SOURCE UNIQUE.
 *
 * Le même contenu alimente la page publique du site et le PDF téléchargeable :
 * une mise à jour ici se propage aux deux. Version 2 du 16 août 2026 (veille
 * légale — loi n° 2026-534 du 25 juin 2026, art. L.6352-4 modifié).
 */

export const RI_VERSION = 'Version 2 — mise à jour le 16 août 2026'

export type BlocRI = { t: 'h'; v: string } | { t: 'p'; v: string } | { t: 'ul'; v: string[] }

export const RI_BLOCS: BlocRI[] = [
  { t: 'h', v: 'I — Préambule' },
  { t: 'p', v: "Le présent règlement intérieur précise les dispositions s'appliquant à tous les inscrits et participants aux formations organisées par Lab Learning (SAS, 6b boulevard Berthelot, 34000 Montpellier — organisme de formation enregistré sous le n° 76 34 13151 34), dans le but de permettre un fonctionnement régulier des formations proposées." },

  { t: 'h', v: 'Article 1 — Objet' },
  { t: 'p', v: "Version 2 — mise à jour le 16 août 2026, à la suite de la veille légale sur les organismes de formation (loi n° 2026-534 du 25 juin 2026 et article L.6352-4 modifié du code du travail) ; annule et remplace la version précédente. Le présent règlement est établi conformément aux dispositions des articles L.6352-3 à L.6352-5 et R.6352-1 à R.6352-15 du code du travail. Il s'applique à tous les bénéficiaires de la formation, pour la durée de la formation suivie. Il définit les règles générales et permanentes, précise la réglementation en matière d'hygiène et de sécurité ainsi que les règles relatives à la discipline, notamment les sanctions applicables aux stagiaires et leurs droits en cas de sanction." },

  { t: 'h', v: 'Article 2 — Personnes concernées' },
  { t: 'p', v: "Le présent règlement s'applique à tous les bénéficiaires inscrits à une session dispensée par Lab Learning, pour toute la durée de la formation suivie. Ses dispositions valent dans l'établissement proprement dit comme dans tout local ou espace accessoire, en particulier pour les formations dispensées en dehors de l'établissement. Lorsque l'entreprise ou l'établissement d'accueil est doté de son propre règlement intérieur, les mesures de santé et de sécurité applicables aux stagiaires sont celles de ce dernier." },
  { t: 'p', v: "Chaque bénéficiaire est considéré comme ayant accepté les termes du présent règlement lorsqu'il suit une formation dispensée par Lab Learning, et accepte que des mesures soient prises à son égard en cas d'inobservation." },

  { t: 'h', v: 'Article 3 — Égalité de traitement des stagiaires' },
  { t: 'p', v: "Conformément à l'article L.6352-4 du code du travail, Lab Learning assure le traitement égal de l'ensemble des stagiaires et apprentis tout au long de leur parcours. Les modalités d'accès, d'accompagnement, d'évaluation et de participation à la formation sont mises en œuvre dans le respect du principe d'égalité de traitement." },

  { t: 'h', v: "Article 4 — Respect de la liberté d'expression" },
  { t: 'p', v: "Lab Learning veille au respect de la liberté d'expression des stagiaires. Les échanges intervenant dans le cadre de la formation doivent toutefois demeurer compatibles avec le bon déroulement des enseignements, le respect des personnes présentes et les dispositions du présent règlement." },

  { t: 'h', v: 'Article 5 — Respect de la liberté de conscience' },
  { t: 'p', v: "Lab Learning garantit le respect de la liberté de conscience des stagiaires. Aucun enseignement ni aucune pratique mis en œuvre dans le cadre de la formation n'a pour objet d'influencer les convictions personnelles, philosophiques, religieuses ou politiques des participants." },

  { t: 'h', v: 'Article 6 — Neutralité des enseignements' },
  { t: 'p', v: "Les enseignements dispensés sont assurés dans le respect du principe de neutralité prévu à l'article L.6352-4 du code du travail. Les contenus pédagogiques sont exclusivement destinés à l'acquisition des compétences et à l'atteinte des objectifs de la formation ; ils sont dispensés sans considération des opinions ou convictions personnelles des stagiaires." },

  { t: 'h', v: 'Article 7 — Lieu de la formation' },
  { t: 'p', v: "Les formations ont lieu dans des locaux extérieurs ou au sein de ceux du client. Dans ce second cas, le client a pris connaissance des moyens requis pour la formation, remis en amont par Lab Learning afin d'en garantir le bon déroulement. Les dispositions du présent règlement sont applicables dans tout local destiné à recevoir des formations." },
  { t: 'p', v: 'Pour les sessions à distance, il est formellement interdit aux stagiaires :' },
  { t: 'ul', v: [
    "de se présenter aux formations en état d'ébriété ;",
    "d'utiliser les téléphones mobiles durant les sessions ;",
    "de s'absenter sans motif lors d'une visioconférence.",
  ] },
  { t: 'p', v: "Les stagiaires s'engagent également à respecter les conditions d'utilisation de l'outil de visioconférence employé (Google Meet)." },

  { t: 'h', v: 'Article 8 — Représentation des stagiaires' },
  { t: 'p', v: "Dans les stages d'une durée supérieure à 200 heures, il est procédé simultanément à l'élection d'un délégué titulaire et d'un délégué suppléant au scrutin uninominal à deux tours. Tous les stagiaires sont électeurs et éligibles ; le scrutin a lieu pendant les heures de formation, au plus tôt vingt heures et au plus tard quarante heures après le début du stage. Le responsable de l'organisme a la charge de l'organisation du scrutin et en assure le bon déroulement ; il adresse un procès-verbal de carence au préfet de région territorialement compétent lorsque la représentation ne peut être assurée. Les délégués sont élus pour la durée du stage." },

  { t: 'h', v: 'II — Hygiène et sécurité' },

  { t: 'h', v: 'Article 9 — Locaux' },
  { t: 'p', v: "La prévention des risques d'accident et de maladie est impérative et exige de chacun le respect total des prescriptions applicables en matière d'hygiène et de sécurité. Les consignes générales et particulières de sécurité en vigueur dans l'organisme, lorsqu'elles existent, doivent être strictement respectées sous peine de sanctions disciplinaires. Pour les stages effectués hors des locaux de Lab Learning, les stagiaires sont tenus de respecter les consignes d'hygiène et de sécurité du lieu où se déroule le stage." },

  { t: 'h', v: 'Article 10 — Accident' },
  { t: 'p', v: "Tout accident ou incident survenu à l'occasion ou en cours de formation doit être immédiatement déclaré par le stagiaire accidenté ou les témoins au responsable de l'organisme. L'accident survenu au stagiaire pendant qu'il se trouve sur le lieu de formation, ou pendant qu'il s'y rend ou en revient, fait l'objet d'une déclaration par le responsable de l'organisme auprès de la caisse de sécurité sociale." },

  { t: 'h', v: "Article 11 — Consignes d'incendie" },
  { t: 'p', v: "Les consignes d'incendie, et notamment un plan de localisation des extincteurs et des issues de secours, sont affichées dans les locaux de formation de manière à être connues de tous les stagiaires." },

  { t: 'h', v: 'III — Discipline générale' },

  { t: 'h', v: 'Article 12 — Interdictions' },
  { t: 'p', v: 'Il est formellement interdit aux stagiaires :' },
  { t: 'ul', v: [
    'de fumer dans les locaux, sauf aménagement spécial à cet effet ;',
    "d'entrer sur le lieu de stage en état d'ivresse ;",
    "d'introduire des boissons alcoolisées dans les locaux ;",
    'de quitter le stage sans motif ou sans avertir les responsables ;',
    "d'emporter un objet sans autorisation écrite ;",
    'de manifester tout comportement de type harcèlement, sexuel ou autre, envers quiconque.',
  ] },

  { t: 'h', v: 'Article 13 — Horaires de stage' },
  { t: 'p', v: "Les horaires de stage sont fixés par Lab Learning et portés à la connaissance des stagiaires par la convocation adressée par voie électronique. Les stagiaires sont tenus de les respecter. Lab Learning se réserve, dans les limites imposées par les dispositions en vigueur, le droit de modifier les horaires en fonction des nécessités de service. En cas d'absence ou de retard, le stagiaire avertit l'organisme et le formateur. Une feuille de présence doit être signée par le stagiaire." },

  { t: 'h', v: 'Article 14 — Accès au lieu de formation' },
  { t: 'p', v: "Sauf autorisation expresse de Lab Learning, les stagiaires ne peuvent entrer ou demeurer sur le lieu de formation à d'autres fins que le suivi de leur stage, ni faciliter l'introduction de tierces personnes." },

  { t: 'h', v: 'Article 15 — Usage du matériel' },
  { t: 'p', v: "Chaque stagiaire conserve en bon état le matériel qui lui est confié en vue de sa formation et l'utilise conformément à son objet. À la fin du stage, il restitue tout matériel et document appartenant à l'organisme, à l'exception des documents pédagogiques distribués en cours de formation." },

  { t: 'h', v: 'Article 16 — Enregistrements' },
  { t: 'p', v: "Il est formellement interdit, sauf dérogation expresse, d'enregistrer ou de filmer les sessions de formation." },

  { t: 'h', v: 'Article 17 — Documentation pédagogique' },
  { t: 'p', v: "La documentation pédagogique remise lors des sessions est protégée au titre du droit d'auteur et ne peut être réutilisée autrement que pour un strict usage personnel." },

  { t: 'h', v: 'Article 18 — Biens personnels' },
  { t: 'p', v: "Lab Learning décline toute responsabilité en cas de perte, vol ou détérioration des objets personnels de toute nature déposés par les stagiaires dans les locaux de formation." },

  { t: 'h', v: 'IV — Sanctions' },

  { t: 'h', v: 'Article 19 — Nature des sanctions' },
  { t: 'p', v: "Tout agissement considéré comme fautif pourra, en fonction de sa nature et de sa gravité, faire l'objet de l'une des sanctions suivantes, classées par ordre d'importance : avertissement écrit, blâme, exclusion définitive de la formation." },

  { t: 'h', v: 'Article 20 — Prononcé des sanctions' },
  { t: 'p', v: "La direction de Lab Learning est seule habilitée à décider de la sanction. Elle s'engage à aviser l'employeur et, le cas échéant, l'organisme paritaire prenant en charge les frais de formation." },

  { t: 'h', v: "V — Droit d'auteur" },
  { t: 'p', v: "Les supports de cours mis à disposition dans le cadre de la formation restent la propriété de Lab Learning et de leurs auteurs. Les usagers s'interdisent toute reproduction ou réutilisation, totale ou partielle, à toutes fins de diffusion interne ou externe, à titre onéreux ou gracieux, quelles qu'en soient les modalités." },

  { t: 'p', v: "Lab Learning — Julien COLELLA, Président. Fait à Montpellier — applicable à compter d'août 2026." },
]
