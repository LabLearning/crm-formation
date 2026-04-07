import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_500, SURFACE_700 } from './components'

interface ContratFormateurProps {
  formateur: any
  org: any
  session?: any
}

export function ContratFormateurPDF({ formateur, org, session }: ContratFormateurProps) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const numero = `CP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Contrat de prestation" numero={numero} date={today} statut="Formation" />

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Entre les parties</Text>
          <View style={shared.row}><Text style={shared.label}>Le donneur d'ordre :</Text><Text style={shared.value}>{org.name} — {org.legal_name || ''}</Text></View>
          <View style={shared.row}><Text style={shared.label}>SIRET :</Text><Text style={shared.value}>{org.siret || ''}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Adresse :</Text><Text style={shared.value}>{org.address || ''} {org.postal_code || ''} {org.city || ''}</Text></View>
          <View style={shared.row}><Text style={shared.label}>N° d'activité :</Text><Text style={shared.value}>{org.numero_da || ''}</Text></View>
          <View style={{ marginTop: 10 }} />
          <View style={shared.row}><Text style={shared.label}>Le prestataire :</Text><Text style={shared.value}>{formateur.prenom} {formateur.nom}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Email :</Text><Text style={shared.value}>{formateur.email || ''}</Text></View>
          {formateur.siret && <View style={shared.row}><Text style={shared.label}>SIRET :</Text><Text style={shared.value}>{formateur.siret}</Text></View>}
          {formateur.adresse && <View style={shared.row}><Text style={shared.label}>Adresse :</Text><Text style={shared.value}>{formateur.adresse} {formateur.code_postal || ''} {formateur.ville || ''}</Text></View>}
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Article 1 — Objet</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            Le donneur d'ordre confie au prestataire, qui l'accepte, la réalisation de prestations de formation professionnelle dans le cadre de son activité d'organisme de formation certifié Qualiopi.
          </Text>
        </View>

        {session && (
          <View style={shared.section}>
            <Text style={shared.sectionTitle}>Article 2 — Mission</Text>
            <View style={shared.row}><Text style={shared.label}>Formation :</Text><Text style={shared.value}>{session.formation?.intitule || session.reference}</Text></View>
            <View style={shared.row}><Text style={shared.label}>Référence :</Text><Text style={shared.value}>{session.reference}</Text></View>
            <View style={shared.row}><Text style={shared.label}>Dates :</Text><Text style={shared.value}>{session.date_debut} au {session.date_fin}</Text></View>
            {session.lieu && <View style={shared.row}><Text style={shared.label}>Lieu :</Text><Text style={shared.value}>{session.lieu}</Text></View>}
            {session.formation?.duree_heures && <View style={shared.row}><Text style={shared.label}>Durée :</Text><Text style={shared.value}>{session.formation.duree_heures} heures</Text></View>}
          </View>
        )}

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>{session ? 'Article 3' : 'Article 2'} — Obligations du prestataire</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            Le prestataire s'engage à :{'\n'}
            - Assurer les formations conformément au programme pédagogique validé{'\n'}
            - Respecter les horaires et le lieu de formation convenus{'\n'}
            - Compléter les feuilles d'émargement via la plateforme Lab Learning{'\n'}
            - Pointer ses heures d'arrivée et de départ (avec preuve photo){'\n'}
            - Remettre un rapport de session à l'issue de chaque formation{'\n'}
            - Respecter le règlement intérieur de l'organisme{'\n'}
            - Garantir la confidentialité des informations relatives aux apprenants{'\n'}
            - Se conformer aux exigences du référentiel Qualiopi
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>{session ? 'Article 4' : 'Article 3'} — Rémunération</Text>
          {formateur.tarif_journalier && <View style={shared.row}><Text style={shared.label}>Tarif journalier HT :</Text><Text style={shared.value}>{Number(formateur.tarif_journalier).toLocaleString('fr-FR')} EUR</Text></View>}
          {formateur.tarif_horaire && <View style={shared.row}><Text style={shared.label}>Tarif horaire HT :</Text><Text style={shared.value}>{Number(formateur.tarif_horaire).toLocaleString('fr-FR')} EUR</Text></View>}
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6, marginTop: 6 }}>
            Le paiement sera effectué sur présentation d'une facture du prestataire, dans un délai de 30 jours suivant la fin de la prestation et la remise du rapport de session. La facture devra être accompagnée des justificatifs de réalisation (émargements, rapport).
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>{session ? 'Article 5' : 'Article 4'} — Propriété intellectuelle</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            Les supports pédagogiques créés dans le cadre de cette prestation restent la propriété de {org.name}. Le prestataire autorise leur utilisation et reproduction dans le cadre des activités de formation de l'organisme.
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>{session ? 'Article 6' : 'Article 5'} — Statut</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            Le prestataire exerce son activité en qualité de travailleur indépendant. Le présent contrat ne crée aucun lien de subordination. Le prestataire est responsable de ses déclarations fiscales et sociales.
          </Text>
        </View>

        <View style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '45%' }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN, marginBottom: 6 }}>Le donneur d'ordre</Text>
            <Text style={{ fontSize: 8, color: SURFACE_500 }}>{org.name}</Text>
            <Text style={{ fontSize: 8, color: SURFACE_500 }}>Date : {today}</Text>
            <View style={{ height: 50, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1', marginTop: 8 }} />
            <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 4 }}>Signature et cachet</Text>
          </View>
          <View style={{ width: '45%' }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN, marginBottom: 6 }}>Le prestataire</Text>
            <Text style={{ fontSize: 8, color: SURFACE_500 }}>{formateur.prenom} {formateur.nom}</Text>
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
