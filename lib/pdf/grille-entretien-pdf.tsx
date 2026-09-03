import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, SURFACE_200, SURFACE_500, SURFACE_900 } from './components'

/**
 * Grille d'entretien de recrutement d'un formateur — trame de l'audit blanc
 * (indicateur 21), vierge : elle sert aux entretiens à venir, elle ne réécrit
 * pas ceux d'hier.
 */
const QUESTIONS = [
  'Parcours du candidat',
  'Quelle maîtrise avez-vous du référentiel concerné par la matière ?',
  "Sans expérience directe sur ce référentiel, comment pensez-vous vous y adapter ?",
  'Meilleure expérience dans le parcours ?',
  'Expérience négative dans le parcours ?',
  'Comment imaginez-vous le poste ? Une journée type ?',
  'Quel type de pédagogie pratiquez-vous ?',
  "Accepteriez-vous d'être audité lors de vos interventions afin de les améliorer ?",
  'Quelles qualités rapporterait votre employeur actuel ou vos collègues ?',
  "Quels axes d'amélioration rapporteraient-ils ?",
  'Quel reporting imaginez-vous mettre en place ? À quelle fréquence ?',
  "Pourquoi votre candidature plutôt qu'une autre ?",
]

function Bloc({ label, hauteur = 34 }: { label: string; hauteur?: number }) {
  return (
    <View wrap={false} style={{ marginBottom: 7 }}>
      <Text style={{ fontSize: 8.5, color: SURFACE_900, lineHeight: 1.4 }}>{label}</Text>
      <View style={{ height: hauteur, borderWidth: 0.5, borderColor: SURFACE_200, borderRadius: 4, marginTop: 3 }} />
    </View>
  )
}

const Case = () => (
  <View style={{ width: 9, height: 9, borderWidth: 0.8, borderColor: SURFACE_500, borderRadius: 2, marginRight: 4 }} />
)

function Choix({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Case /><Text style={{ fontSize: 8 }}>{label}</Text>
    </View>
  )
}

export function GrilleEntretienPDF({ org }: { org: any }) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Grille d'entretien de recrutement — formateur" numero="" org={org} />

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          {['Candidat', 'Recruteur', 'Date et heure', 'Domaine / référentiel visé'].map((l) => (
            <View key={l} style={{ flex: 1 }}>
              <Text style={{ fontSize: 7.5, color: SURFACE_500 }}>{l}</Text>
              <View style={{ borderBottomWidth: 0.5, borderBottomColor: SURFACE_500, height: 13, marginTop: 2 }} />
            </View>
          ))}
        </View>

        {QUESTIONS.map((q, i) => (
          <Bloc key={i} label={`${i + 1}. ${q}`} hauteur={i === 0 ? 54 : 34} />
        ))}

        <View wrap={false} style={{ marginTop: 6, borderTopWidth: 0.5, borderTopColor: SURFACE_200, paddingTop: 8 }}>
          <Text style={{ fontSize: 8.5, color: SURFACE_900, marginBottom: 4 }}>
            Conditions de qualification : diplôme de niveau III ou supérieur, OU au moins 2 ans
            d&apos;expérience professionnelle dans la matière.
          </Text>
          <View style={{ flexDirection: 'row', gap: 22, marginBottom: 6 }}>
            <Choix label="Conditions remplies" />
            <Choix label="Non remplies" />
          </View>
          <Text style={{ fontSize: 8.5, color: SURFACE_900, marginBottom: 4 }}>
            Progression pédagogique demandée pour vérifier la compétence sur la thématique visée :
          </Text>
          <View style={{ flexDirection: 'row', gap: 22, marginBottom: 6 }}>
            <Choix label="Remise le ______ — contenu validé" />
            <Choix label="Non remise" />
          </View>
          <View style={{ flexDirection: 'row', gap: 22 }}>
            <Choix label="À convoquer pour un nouvel entretien" />
            <Choix label="Candidature retenue" />
          </View>
        </View>

        <PdfDocFooter numero="Grille d'entretien formateur" org={org} />
      </Page>
    </Document>
  )
}
