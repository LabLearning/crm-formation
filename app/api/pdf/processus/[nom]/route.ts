import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { withDocumentLogo } from '@/lib/pdf/org-logo'
import { ProcessusPDF, type SectionProcessus } from '@/lib/pdf/processus-pdf'

export const dynamic = 'force-dynamic'

/**
 * Les processus internes exigés par le référentiel, rendus en PDF. Chaque
 * étape est rattachée à l'outil du CRM qui en garde la trace : c'est la
 * différence entre une procédure vivante et une page écrite pour l'audit.
 */
const PROCESSUS: Record<string, { titre: string; reference: string; intro: string; sections: SectionProcessus[] }> = {
  abandons: {
    titre: 'Prévention et gestion des abandons',
    reference: 'PROC-12',
    intro:
      "Processus applicable aux formations de plus de deux jours (indicateur 12 du RNQ). L'essentiel de l'activité se déroule en intra, sur le poste de travail : le risque d'abandon se joue dans les premières heures et se détecte par l'assiduité.",
    sections: [
      {
        titre: "1. Prévenir l'abandon avant l'entrée",
        etapes: [
          { quand: 'Au recueil du besoin', quoi: "Le projet du bénéficiaire est analysé avec l'employeur : une formation cohérente avec le poste réel est la première prévention de l'abandon.", outil: 'recueil du besoin (onglet Recueil de la session)' },
          { quand: 'À la convocation', quoi: "Convocation adressée par email, et confirmation de présence la veille de l'entrée en formation.", outil: 'convocations tracées sur la session (email_logs)' },
        ],
      },
      {
        titre: "2. Détecter le décrochage pendant la formation",
        etapes: [
          { quand: 'Chaque demi-journée', quoi: "L'émargement est relevé par créneau ; toute absence est visible immédiatement par l'organisme.", outil: 'émargements de la session' },
          { quand: 'Dès la 1re absence', quoi: "Le formateur signale l'absence ; l'organisme contacte le stagiaire ou son employeur pour en comprendre la cause, et le motif est consigné.", outil: 'écran Absences à justifier (/dashboard/absences)' },
          { quand: 'Absence répétée', quoi: "Entretien avec le stagiaire et l'employeur : aménagement du parcours (rythme, dates de rattrapage) ou report sur une session ultérieure.", outil: 'fiche session — notes et replanification' },
        ],
      },
      {
        titre: "3. Traiter l'abandon avéré",
        etapes: [
          { quand: "À l'abandon", quoi: "L'inscription passe au statut « abandonné » ; le motif est recueilli auprès du stagiaire (questionnaire d'abandon ou entretien téléphonique) et consigné.", outil: 'inscription (statut) + motif d’absence « Abandon de la formation »' },
          { quand: 'Sous 7 jours', quoi: "L'employeur et, le cas échéant, le financeur sont informés ; la facturation est ajustée au réalisé (certificat de réalisation au prorata des heures).", outil: 'certificat de réalisation (heures réalisées) + facture' },
          { quand: 'Au fil du registre', quoi: "L'abandon est analysé comme dysfonctionnement : cause, action corrective éventuelle, entrée au plan d'amélioration continue.", outil: 'registre des dysfonctionnements + plan d’amélioration' },
        ],
      },
      {
        titre: "4. Questionnaire d'abandon",
        paragraphes: [
          "Trois questions posées au stagiaire qui interrompt son parcours, par téléphone ou par écrit : (1) Quelle est la raison principale de votre arrêt ? (2) La formation correspondait-elle à ce qui vous avait été annoncé ? (3) Qu'aurait-il fallu changer pour que vous poursuiviez ? Les réponses sont consignées au dossier de la session et nourrissent l'analyse des causes.",
        ],
      },
    ],
  },
  adaptation: {
    titre: 'Adaptation des prestations, de l’accompagnement et du suivi',
    reference: 'PROC-10',
    intro:
      "Comment la prestation s'adapte aux bénéficiaires (indicateur 10 du RNQ). L'adaptation n'est pas une option pédagogique : en intra, chaque session est construite sur l'établissement réel — ses équipements, son organisation, son équipe.",
    sections: [
      {
        titre: '1. Adapter la conception',
        etapes: [
          { quand: 'Avant la session', quoi: "Le recueil du besoin identifie le contexte de l'établissement, les attentes de l'employeur et les besoins particuliers des stagiaires — dont les situations de handicap et les besoins de compensation.", outil: 'recueil du besoin' },
          { quand: 'Au montage', quoi: 'Le programme est ajusté au poste de travail réel : matériel de l’établissement, cartes et produits effectivement travaillés, contraintes de service.', outil: 'déroulé pédagogique de la session' },
        ],
      },
      {
        titre: "2. Adapter l'animation",
        etapes: [
          { quand: "À l'entrée", quoi: "Le questionnaire de positionnement situe chaque stagiaire ; le formateur mène l'entretien individuellement — le niveau de français ou d'écrit ne doit jamais empêcher l'évaluation.", outil: 'questionnaire de positionnement (résultats sur la session)' },
          { quand: 'Pendant', quoi: 'Groupes de niveau constitués d’après le positionnement, démonstrations au poste plutôt que supports écrits quand le public le demande, reprise individuelle des gestes non acquis.', outil: 'notes de session + évaluation des acquis' },
          { quand: 'Si besoin identifié', quoi: "Pour un stagiaire en situation de handicap : mobilisation du référent handicap, appui de la Ressource Handicap Formation (Agefiph) pour les aménagements.", outil: 'référent handicap (paramètres) + registre de veille handicap' },
        ],
      },
      {
        titre: '3. Adaptation spécifique — formations hygiène (audit en établissement)',
        etapes: [
          { quand: "En début d'intervention", quoi: "Le formateur réalise l'audit d'hygiène de l'établissement : locaux, températures, stockage, traçabilité, plan de nettoyage — constats relevés poste par poste.", outil: "audit hygiène terrain (AuditHygiène, synchronisé au CRM)" },
          { quand: "À l'analyse", quoi: 'Les non-conformités sont hiérarchisées par criticité ; les non-conformités MAJEURES deviennent les axes prioritaires de la formation.', outil: "rapport d'audit (non-conformités par criticité)" },
          { quand: 'Pendant la formation', quoi: "Le déroulé est réaxé sur les non-conformités majeures relevées : chaque apport théorique s'appuie sur un constat réel de l'établissement, la mise en pratique corrige le poste concerné.", outil: 'déroulé pédagogique ajusté + notes de session' },
          { quand: 'En clôture', quoi: "La levée des non-conformités est vérifiée avec l'équipe ; les points restants sont remis à l'exploitant sous forme de plan d'actions.", outil: "plan d'actions remis + DUERP le cas échéant" },
        ],
      },
      {
        titre: '4. Adapter le suivi',
        etapes: [
          { quand: 'Au dernier jour', quoi: "L'évaluation des acquis mesure l'atteinte des objectifs ; un stagiaire en difficulté fait l'objet de recommandations écrites au bilan (POEI) ou d'une proposition de renforcement.", outil: 'évaluation des acquis + grilles POEI' },
          { quand: 'Après la formation', quoi: 'La satisfaction à chaud puis à froid (J+90) vérifie que les acquis servent en poste ; les écarts remontent au plan d’amélioration.', outil: 'questionnaires de satisfaction + plan d’amélioration' },
        ],
      },
      {
        titre: '5. Exemples de mise en œuvre',
        paragraphes: [
          "Parcours POEI construits par enseigne (référentiels distincts par concept de restauration), groupes du matin et du soir dédoublés pour suivre les équipes de service, entretiens individuels de positionnement systématiques en restauration rapide, évaluations menées à l'oral au poste de travail lorsque l'écrit est un obstacle.",
          "Adaptation linguistique : supports de formation traduits en bengali par le formateur (G. Pledran) pour une équipe non francophone d'un établissement de restauration rapide — la pièce est conservée au dossier de la session concernée.",
        ],
      },
    ],
  },
  intra: {
    titre: "Déroulé d'une formation en entreprise",
    reference: 'PROC-06',
    intro:
      "Comment se déroule concrètement une action de formation intra-entreprise Lab Learning, du premier contact aux documents de clôture — chaque étape laisse sa trace dans le CRM (indicateurs 6, 9, 10, 11, 12 du RNQ).",
    sections: [
      {
        titre: '1. Avant la session',
        etapes: [
          { quand: 'Au premier contact', quoi: "Recueil du besoin avec l'établissement : contexte, participants, niveau initial, objectifs, contraintes et besoins d'adaptation (handicap, langue). Il conditionne l'envoi de la convention.", outil: 'recueil du besoin (onglet Recueil de la session)' },
          { quand: 'À la contractualisation', quoi: 'Convention signée électroniquement par le gérant — datée avant le début de session ; le programme et les tarifs (barèmes OPCO) y sont joints.', outil: 'convention + email_logs' },
          { quand: 'J-1', quoi: "Convocation envoyée à chaque stagiaire (ou au référent de l'établissement) avec le programme, le règlement intérieur et le livret d'accueil.", outil: 'marquage convocations_sent_at + email_logs (cron J-1)' },
        ],
      },
      {
        titre: '2. Pendant la session (sur le lieu de travail)',
        etapes: [
          { quand: 'Jour 1, accueil', quoi: "Tour de table, rappel des objectifs et du déroulé, vérification des besoins d'adaptation. Émargement par demi-journée (signature électronique ou feuille papier numérisée).", outil: 'émargements de la session' },
          { quand: 'Jour 1', quoi: "Questionnaire de positionnement individuel — mêmes questions que l'évaluation de sortie, pour mesurer la progression.", outil: 'positionnement (scores sur la session)' },
          { quand: 'Chaque module', quoi: 'Alternance apports théoriques courts / démonstration au poste de travail / mise en pratique par le stagiaire sur son propre équipement, avec reprise individuelle des gestes non acquis.', outil: 'programme (modalités par module) + rapport du formateur' },
          { quand: 'Dernier jour', quoi: "Évaluation des acquis, questionnaire de satisfaction à chaud, remise des supports pédagogiques aux stagiaires (envoi tracé + portail apprenant).", outil: 'évaluation de sortie + satisfaction + envoi des supports' },
        ],
      },
      {
        titre: '3. Après la session',
        etapes: [
          { quand: 'À la clôture', quoi: "Rapport de fin de session transmis par le formateur ; documents de clôture émis (attestation de fin de formation, certificat de réalisation, attestation d'hygiène le cas échéant) et envoyés aux stagiaires et au référent.", outil: 'rapport de session + documents de clôture' },
          { quand: 'Dans la semaine', quoi: "Retour client par téléphone : ce que l'établissement a constaté, noté tel quel sur la session.", outil: 'retour client (onglet Rapport)' },
          { quand: 'J+90', quoi: 'Satisfaction à froid envoyée aux stagiaires, relancée à J+97 et J+104 vers les non-répondants.', outil: 'cron satisfaction-froid + relances' },
        ],
      },
    ],
  },
}

export async function GET(_req: Request, { params }: { params: { nom: string } }) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error
  const def = PROCESSUS[params.nom]
  if (!def) return NextResponse.json({ error: 'Processus inconnu' }, { status: 404 })

  const supabase = await createServiceRoleClient()
  const { data: orgRow } = await supabase.from('organizations').select('*').eq('id', auth.user.organizationId).maybeSingle()
  const org = await withDocumentLogo(supabase, orgRow)

  const buffer = await renderToBuffer(createElement(ProcessusPDF, { org, ...def }) as any)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="processus-${params.nom}.pdf"`,
    },
  })
}
