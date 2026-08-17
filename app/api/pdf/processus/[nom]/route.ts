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
        titre: '3. Adapter le suivi',
        etapes: [
          { quand: 'Au dernier jour', quoi: "L'évaluation des acquis mesure l'atteinte des objectifs ; un stagiaire en difficulté fait l'objet de recommandations écrites au bilan (POEI) ou d'une proposition de renforcement.", outil: 'évaluation des acquis + grilles POEI' },
          { quand: 'Après la formation', quoi: 'La satisfaction à chaud puis à froid (J+90) vérifie que les acquis servent en poste ; les écarts remontent au plan d’amélioration.', outil: 'questionnaires de satisfaction + plan d’amélioration' },
        ],
      },
      {
        titre: '4. Exemples de mise en œuvre',
        paragraphes: [
          "Parcours POEI construits par enseigne (référentiels distincts par concept de restauration), groupes du matin et du soir dédoublés pour suivre les équipes de service, entretiens individuels de positionnement systématiques en restauration rapide, évaluations menées à l'oral au poste de travail lorsque l'écrit est un obstacle.",
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
