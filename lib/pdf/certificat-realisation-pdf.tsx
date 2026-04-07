import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

interface CertificatRealisationProps {
  apprenant: any
  session: any
  formation: any
  org: any
  assiduite?: number
  heuresPresence?: number
}

export function CertificatRealisationPDF({ apprenant, session, formation, org, assiduite, heuresPresence }: CertificatRealisationProps) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const numero = `CR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
  const duree = formation.duree_heures || 0

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Certificat de réalisation" numero={numero} date={today} />

        <View style={shared.infoBox}>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            Conformément aux dispositions de l'article L.6353-1 du Code du travail
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Organisme de formation</Text>
          <View style={shared.row}><Text style={shared.label}>Raison sociale :</Text><Text style={shared.value}>{org.legal_name || org.name}</Text></View>
          <View style={shared.row}><Text style={shared.label}>N° déclaration :</Text><Text style={shared.value}>{org.numero_da || ''}</Text></View>
          <View style={shared.row}><Text style={shared.label}>SIRET :</Text><Text style={shared.value}>{org.siret || ''}</Text></View>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Stagiaire</Text>
          <View style={shared.row}><Text style={shared.label}>Nom :</Text><Text style={shared.value}>{apprenant.prenom} {apprenant.nom}</Text></View>
          {apprenant.entreprise && <View style={shared.row}><Text style={shared.label}>Entreprise :</Text><Text style={shared.value}>{apprenant.entreprise}</Text></View>}
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Action de formation</Text>
          <View style={shared.row}><Text style={shared.label}>Intitulé :</Text><Text style={{ ...shared.value, fontFamily: 'Helvetica-Bold' }}>{formation.intitule}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Durée prévue :</Text><Text style={shared.value}>{duree} heures</Text></View>
          <View style={shared.row}><Text style={shared.label}>Durée réalisée :</Text><Text style={shared.value}>{heuresPresence || duree} heures</Text></View>
          <View style={shared.row}><Text style={shared.label}>Modalité :</Text><Text style={shared.value}>{formation.modalite === 'presentiel' ? 'Présentiel' : formation.modalite === 'distanciel' ? 'Distanciel' : 'Mixte'}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Dates :</Text><Text style={shared.value}>Du {new Date(session.date_debut).toLocaleDateString('fr-FR')} au {new Date(session.date_fin).toLocaleDateString('fr-FR')}</Text></View>
          {session.lieu && <View style={shared.row}><Text style={shared.label}>Lieu :</Text><Text style={shared.value}>{session.lieu}</Text></View>}
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Réalisation</Text>
          <Text style={{ fontSize: 9, color: SURFACE_900, lineHeight: 1.8 }}>
            Je soussigné(e), représentant(e) de {org.name}, atteste que l'action de formation mentionnée ci-dessus a été réalisée{assiduite != null ? ` avec un taux d'assiduité de ${assiduite}%` : ''}.
          </Text>
          {assiduite != null && assiduite < 100 && (
            <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6, marginTop: 6 }}>
              Note : Le stagiaire a été absent sur une partie de la formation. Le taux d'assiduité est calculé sur la base des feuilles d'émargement signées.
            </Text>
          )}
        </View>

        <View style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '45%' }}>
            <Text style={{ fontSize: 8, color: SURFACE_500 }}>Fait à {org.city || '___________'}, le {today}</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN, marginBottom: 6 }}>L'organisme de formation</Text>
              <View style={{ height: 50, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1' }} />
              <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 4 }}>Signature et cachet</Text>
            </View>
          </View>
          <View style={{ width: '45%' }}>
            <Text style={{ fontSize: 8, color: SURFACE_500 }}> </Text>
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN, marginBottom: 6 }}>Le stagiaire</Text>
              <View style={{ height: 50, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1' }} />
              <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 4 }}>Signature</Text>
            </View>
          </View>
        </View>

        <PdfDocFooter numero={numero} />
      </Page>
    </Document>
  )
}
