import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfSectionTitle, PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

interface Props {
  session: any
  formation: any
  org: any
  formateur: any
  participants: { civilite?: string | null; prenom?: string | null; nom?: string | null }[]
  entreprise?: string | null
  referentNom?: string | null
}

/**
 * Convocation de session adressée au référent de l'établissement, listant
 * l'ensemble des participants convoqués.
 */
export function ConvocationSessionPDF({ session, formation, org, formateur, participants, entreprise, referentNom }: Props) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const numero = `CONV-${new Date().getFullYear()}-${String(session.reference || session.id).slice(0, 8)}`
  const lieu = session.lieu || [session.adresse, session.code_postal, session.ville].filter(Boolean).join(', ') || 'le lieu communiqué par l\'organisme'
  const dDebut = new Date(session.date_debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dFin = new Date(session.date_fin || session.date_debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Convocation de formation" numero={numero} date={today} org={org} />

        <View style={shared.section}>
          {entreprise && <Text style={{ fontSize: 10, color: SURFACE_900, fontFamily: 'Satoshi', fontWeight: 700 }}>{entreprise}</Text>}
          {referentNom && <Text style={{ fontSize: 9, color: SURFACE_500, marginTop: 2 }}>À l'attention de {referentNom}</Text>}
        </View>

        <View style={shared.section}>
          <Text style={{ fontSize: 10, color: SURFACE_700, lineHeight: 1.8 }}>Madame, Monsieur,</Text>
          <Text style={{ fontSize: 10, color: SURFACE_700, lineHeight: 1.8, marginTop: 8 }}>
            Nous avons le plaisir de convoquer les collaborateurs de votre établissement à la session de
            formation détaillée ci-dessous. Merci de bien vouloir leur transmettre cette convocation.
          </Text>
        </View>

        <View style={shared.section}>
          <PdfSectionTitle>Détails de la formation</PdfSectionTitle>
          <View style={shared.row}><Text style={shared.label}>Intitulé :</Text><Text style={{ ...shared.value, fontFamily: 'Satoshi', fontWeight: 700 }}>{formation?.intitule || session.intitule || '—'}</Text></View>
          {formation?.duree_heures ? <View style={shared.row}><Text style={shared.label}>Durée :</Text><Text style={shared.value}>{formation.duree_heures} heures</Text></View> : null}
          <View style={shared.row}><Text style={shared.label}>Début :</Text><Text style={shared.value}>{dDebut}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Fin :</Text><Text style={shared.value}>{dFin}</Text></View>
          {session.horaires && <View style={shared.row}><Text style={shared.label}>Horaires :</Text><Text style={shared.value}>{session.horaires}</Text></View>}
          <View style={shared.row}><Text style={shared.label}>Lieu :</Text><Text style={shared.value}>{lieu}</Text></View>
          {session.lien_visio && <View style={shared.row}><Text style={shared.label}>Lien visio :</Text><Text style={shared.value}>{session.lien_visio}</Text></View>}
          {formateur && <View style={shared.row}><Text style={shared.label}>Formateur :</Text><Text style={shared.value}>{`${formateur.prenom || ''} ${formateur.nom || ''}`.trim()}</Text></View>}
        </View>

        <View style={shared.section}>
          <PdfSectionTitle>Participants convoqués ({participants.length})</PdfSectionTitle>
          <View style={{ marginTop: 4 }}>
            {participants.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#e7e5e4' }}>
                <Text style={{ fontSize: 8, color: SURFACE_500, width: 22 }}>{i + 1}.</Text>
                <Text style={{ fontSize: 9, color: SURFACE_900 }}>{[p.civilite, p.prenom, p.nom].filter(Boolean).join(' ')}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={shared.section}>
          <PdfSectionTitle>Informations pratiques</PdfSectionTitle>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            - Merci de vous présenter 15 minutes avant le début de la session.{'\n'}
            - L'émargement est obligatoire pour chaque demi-journée.{'\n'}
            - Une attestation de fin de formation sera remise à chaque participant à l'issue de la session.
          </Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 8, color: SURFACE_500 }}>Fait à {org?.city || org?.ville || '___________'}, le {today}</Text>
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN, marginBottom: 6 }}>Pour {org?.name || 'Lab Learning'}</Text>
            <View style={{ height: 46, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1', width: 200 }} />
            <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 4 }}>Signature et cachet</Text>
          </View>
        </View>

        <PdfDocFooter numero={numero} org={org} />
      </Page>
    </Document>
  )
}
