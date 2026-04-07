import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_500, SURFACE_700 } from './components'

interface ContratApporteurProps {
  apporteur: any
  org: any
}

export function ContratApporteurPDF({ apporteur, org }: ContratApporteurProps) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const numero = `CA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Contrat d'apporteur d'affaires" numero={numero} date={today} />

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Entre les parties</Text>
          <View style={shared.row}><Text style={shared.label}>L'organisme :</Text><Text style={shared.value}>{org.name} — {org.legal_name || ''}</Text></View>
          <View style={shared.row}><Text style={shared.label}>SIRET :</Text><Text style={shared.value}>{org.siret || 'Non renseigné'}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Adresse :</Text><Text style={shared.value}>{org.address || ''} {org.postal_code || ''} {org.city || ''}</Text></View>
          <View style={{ marginTop: 10 }} />
          <View style={shared.row}><Text style={shared.label}>L'apporteur :</Text><Text style={shared.value}>{apporteur.prenom} {apporteur.nom}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Email :</Text><Text style={shared.value}>{apporteur.email || ''}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Téléphone :</Text><Text style={shared.value}>{apporteur.telephone || ''}</Text></View>
          {apporteur.siret && <View style={shared.row}><Text style={shared.label}>SIRET :</Text><Text style={shared.value}>{apporteur.siret}</Text></View>}
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Article 1 — Objet du contrat</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            Le présent contrat a pour objet de définir les conditions dans lesquelles l'Apporteur d'affaires s'engage à présenter des prospects susceptibles de devenir clients de l'Organisme pour ses formations professionnelles.
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Article 2 — Obligations de l'apporteur</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            L'Apporteur s'engage à :{'\n'}
            - Identifier et présenter des prospects qualifiés via la plateforme Lab Learning{'\n'}
            - Fournir des informations exactes sur les prospects présentés{'\n'}
            - Respecter l'image et les valeurs de l'Organisme{'\n'}
            - Ne pas prendre d'engagements au nom de l'Organisme{'\n'}
            - Respecter la confidentialité des informations communiquées
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Article 3 — Rémunération</Text>
          <View style={shared.row}><Text style={shared.label}>Taux de commission :</Text><Text style={shared.value}>{apporteur.taux_commission || 10}%</Text></View>
          <View style={shared.row}><Text style={shared.label}>Base de calcul :</Text><Text style={shared.value}>Montant HT des formations effectivement réalisées</Text></View>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6, marginTop: 6 }}>
            La commission est due uniquement pour les affaires effectivement conclues et réalisées. Le paiement intervient après encaissement intégral par l'Organisme du montant de la formation.
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Article 4 — Durée</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            Le présent contrat est conclu pour une durée indéterminée à compter de sa date de signature. Chaque partie peut y mettre fin par lettre recommandée avec accusé de réception, moyennant un préavis de 30 jours. Les commissions dues pour les affaires en cours restent acquises.
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Article 5 — Confidentialité</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            L'Apporteur s'engage à garder strictement confidentielles toutes les informations commerciales, financières et techniques dont il aurait connaissance dans le cadre du présent contrat. Cette obligation perdure 2 ans après la fin du contrat.
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Article 6 — Statut</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            L'Apporteur exerce son activité en toute indépendance. Le présent contrat ne crée aucun lien de subordination entre les parties. L'Apporteur est seul responsable de ses obligations fiscales et sociales.
          </Text>
        </View>

        <View style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '45%' }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN, marginBottom: 6 }}>L'Organisme</Text>
            <Text style={{ fontSize: 8, color: SURFACE_500 }}>{org.name}</Text>
            <Text style={{ fontSize: 8, color: SURFACE_500 }}>Date : {today}</Text>
            <View style={{ height: 50, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1', marginTop: 8 }} />
            <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 4 }}>Signature et cachet</Text>
          </View>
          <View style={{ width: '45%' }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN, marginBottom: 6 }}>L'Apporteur</Text>
            <Text style={{ fontSize: 8, color: SURFACE_500 }}>{apporteur.prenom} {apporteur.nom}</Text>
            <Text style={{ fontSize: 8, color: SURFACE_500 }}>Date : {today}</Text>
            <View style={{ height: 50, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1', marginTop: 8 }} />
            <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 4 }}>Signature précédée de "Lu et approuvé"</Text>
          </View>
        </View>

        <PdfDocFooter numero={numero} />
      </Page>
    </Document>
  )
}
