import * as React from 'react'
import { Document, Page, View, Text, Image } from '@react-pdf/renderer'
import { PdfSectionTitle, PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

interface CertificatRealisationProps {
  apprenant: any
  session: any
  formation: any
  org: any
  assiduite?: number
  heuresPresence?: number
  /** Signature électronique du bénéficiaire (candidat POEI) */
  signatureCandidat?: { data?: string | null; nom?: string | null; signedAt?: string | null } | null
  /** Date portée sur le certificat (ex. dernier jour de la POEI) */
  dateSignature?: string | null
}

export function CertificatRealisationPDF({ apprenant, session, formation, org, assiduite, heuresPresence, signatureCandidat, dateSignature }: CertificatRealisationProps) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  // La date portée sur le certificat prime sur la date du jour (dernier jour de POEI)
  const dateSignatureAffichee = dateSignature
    ? new Date(dateSignature).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const numero = `CR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
  const duree = formation.duree_heures || 0
  const heuresRealisees = heuresPresence != null ? heuresPresence : duree
  const enTotalite = !duree || heuresRealisees >= duree
  const representant = [org?.representant_legal_civilite, org?.representant_legal_prenom, org?.representant_legal_nom].filter(Boolean).join(' ').trim() || `le représentant légal de ${org?.name || 'l\'organisme'}`

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Certificat de réalisation" numero={numero} date={today} org={org} />

        <View style={shared.infoBox}>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            Conformément aux dispositions de l'article L.6353-1 du Code du travail
          </Text>
        </View>

        <View style={shared.section}>
          <PdfSectionTitle>Organisme de formation</PdfSectionTitle>
          <View style={shared.row}><Text style={shared.label}>Raison sociale :</Text><Text style={shared.value}>{org.legal_name || org.name}</Text></View>
          <View style={shared.row}><Text style={shared.label}>N° déclaration :</Text><Text style={shared.value}>{org.numero_da || ''}</Text></View>
          <View style={shared.row}><Text style={shared.label}>SIRET :</Text><Text style={shared.value}>{org.siret || ''}</Text></View>
        </View>

        <View style={shared.section}>
          <PdfSectionTitle>Stagiaire</PdfSectionTitle>
          <View style={shared.row}><Text style={shared.label}>Nom :</Text><Text style={shared.value}>{apprenant.prenom} {apprenant.nom}</Text></View>
          {apprenant.entreprise && <View style={shared.row}><Text style={shared.label}>Entreprise :</Text><Text style={shared.value}>{apprenant.entreprise}</Text></View>}
        </View>

        <View style={shared.section}>
          <PdfSectionTitle>Caractéristiques de l'action</PdfSectionTitle>
          <View style={shared.row}><Text style={shared.label}>Intitulé :</Text><Text style={{ ...shared.value, fontFamily: 'Satoshi', fontWeight: 700 }}>{formation.intitule}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Nature :</Text><Text style={shared.value}>Action de formation</Text></View>
          <View style={shared.row}><Text style={shared.label}>Modalité :</Text><Text style={shared.value}>{formation.modalite === 'distanciel' ? 'À distance' : formation.modalite === 'mixte' ? 'Mixte (présentiel + à distance)' : 'Présentiel'}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Dates :</Text><Text style={shared.value}>Du {new Date(session.date_debut).toLocaleDateString('fr-FR')} au {new Date(session.date_fin).toLocaleDateString('fr-FR')}</Text></View>
          <View style={shared.row}><Text style={shared.label}>Nombre total d'heures :</Text><Text style={{ ...shared.value, fontFamily: 'Satoshi', fontWeight: 700 }}>{heuresRealisees} heures réalisées{duree && heuresRealisees < duree ? ` (sur ${duree} h prévues)` : ''}</Text></View>
          {session.lieu && <View style={shared.row}><Text style={shared.label}>Lieu :</Text><Text style={shared.value}>{session.lieu}</Text></View>}
        </View>

        <View style={shared.section}>
          <PdfSectionTitle>Attestation</PdfSectionTitle>
          <Text style={{ fontSize: 9, color: SURFACE_900, lineHeight: 1.8 }}>
            Je soussigné(e) {representant}, atteste que {apprenant.prenom} {apprenant.nom} a réalisé {enTotalite ? 'en totalité' : 'partiellement'} une action concourant au développement des compétences (action de formation au sens de l'article L.6313-1 du Code du travail), dont les caractéristiques figurent ci-dessus.
          </Text>
          {assiduite != null && (
            <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6, marginTop: 6 }}>
              Taux d'assiduité : {assiduite}% (calculé sur la base des feuilles d'émargement signées).
            </Text>
          )}
        </View>

        <View style={{ marginTop: 30 }}>
          <Text style={{ fontSize: 8, color: SURFACE_500 }}>
            Fait à {org.city || '___________'}, le {dateSignatureAffichee || today}, pour faire valoir ce que de droit.
          </Text>
          {/* Deux signatures : le dispensateur (tampon) et le bénéficiaire */}
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 12 }} wrap={false}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN, marginBottom: 6 }}>Pour {org.name} — {representant}</Text>
              <View style={{ height: 60, position: 'relative', borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1' }}>
                {org.tampon_signature_url ? (
                  <Image src={org.tampon_signature_url} style={{ position: 'absolute', top: 0, left: 0, width: 150, height: 75, objectFit: 'contain' }} />
                ) : null}
              </View>
              <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 4 }}>Signature et cachet du dispensateur</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN, marginBottom: 6 }}>
                Le bénéficiaire — {signatureCandidat?.nom || `${apprenant.prenom} ${apprenant.nom}`}
              </Text>
              <View style={{ height: 60, position: 'relative', borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1' }}>
                {signatureCandidat?.data ? (
                  <Image src={signatureCandidat.data} style={{ position: 'absolute', top: 0, left: 0, width: 140, height: 60, objectFit: 'contain' }} />
                ) : null}
              </View>
              <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 4 }}>
                {signatureCandidat?.data
                  ? `Signé électroniquement${signatureCandidat.signedAt ? ` le ${new Date(signatureCandidat.signedAt).toLocaleDateString('fr-FR')}` : ''}`
                  : 'Signature du bénéficiaire'}
              </Text>
            </View>
          </View>
        </View>

        <PdfDocFooter numero={numero} org={org} />
      </Page>
    </Document>
  )
}
