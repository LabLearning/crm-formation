import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfSectionTitle, shared, PdfDocHeader, PdfDocFooter } from './components'

function fmt(n: number | string | null | undefined): string {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, ' ')
}
function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Facture de prestation émise PAR un formateur À Lab Learning.
 * Émetteur = le formateur ; Facturer à = l'organisme (org).
 */
export function FactureFormateurPDF({ facture, formateur, org }: { facture: any; formateur: any; org?: any }) {
  const f = formateur || {}
  const emetteur = [f.civilite, f.prenom, f.nom].filter(Boolean).join(' ').trim() || 'Formateur'
  const ofNom = org?.legal_name || org?.name || 'Lab Learning'
  const tauxTva = Number(facture.taux_tva || 0)
  const numAffiche = facture.reference_externe || facture.numero

  return (
    <Document title={`Facture ${numAffiche}`} author={emetteur}>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader
          docTitle="Facture de prestation"
          numero={numAffiche}
          date={`Émise le ${fmtDate(facture.date_emission || facture.created_at)}`}
          org={org}
        />

        {/* Émetteur (formateur) + Facturer à (OF) */}
        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <PdfSectionTitle>Émetteur (formateur)</PdfSectionTitle>
            <Text style={{ fontSize: 9, fontFamily: 'Satoshi', fontWeight: 700, marginBottom: 3 }}>{emetteur}</Text>
            {f.adresse && <Text style={{ fontSize: 8, color: '#57534e' }}>{f.adresse}</Text>}
            {(f.code_postal || f.ville) && <Text style={{ fontSize: 8, color: '#57534e' }}>{f.code_postal || ''} {f.ville || ''}</Text>}
            {f.siret && <Text style={{ fontSize: 8, color: '#57534e', marginTop: 2 }}>SIRET : {f.siret}</Text>}
            {f.numero_da && <Text style={{ fontSize: 8, color: '#57534e' }}>N° déclaration d'activité : {f.numero_da}</Text>}
            {f.email && <Text style={{ fontSize: 8, color: '#57534e' }}>{f.email}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <PdfSectionTitle>Facturer à</PdfSectionTitle>
            <Text style={{ fontSize: 9, fontFamily: 'Satoshi', fontWeight: 700, marginBottom: 3 }}>{ofNom}</Text>
            {org?.address && <Text style={{ fontSize: 8, color: '#57534e' }}>{org.address}</Text>}
            {(org?.postal_code || org?.city) && <Text style={{ fontSize: 8, color: '#57534e' }}>{org?.postal_code || ''} {org?.city || ''}</Text>}
            {org?.siret && <Text style={{ fontSize: 8, color: '#57534e', marginTop: 2 }}>SIRET : {org.siret}</Text>}
            {org?.numero_tva_intra && <Text style={{ fontSize: 8, color: '#57534e' }}>TVA : {org.numero_tva_intra}</Text>}
          </View>
        </View>

        {/* Objet */}
        {facture.objet && (
          <View style={{ ...shared.infoBox, marginBottom: 16 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, marginBottom: 2 }}>Objet</Text>
            <Text style={shared.infoBoxText}>{facture.objet}</Text>
          </View>
        )}

        {/* Détail */}
        <View style={shared.section}>
          <PdfSectionTitle>Détail de la prestation</PdfSectionTitle>
          <View style={shared.table}>
            <View style={shared.tableHeader}>
              <Text style={{ ...shared.tableHeaderCell, flex: 4 }}>Désignation</Text>
              <Text style={{ ...shared.tableHeaderCell, width: 70, textAlign: 'right' }}>Montant HT</Text>
            </View>
            <View style={shared.tableRow}>
              <View style={{ flex: 4 }}>
                <Text style={shared.tableCell}>{facture.objet || 'Prestation de formation'}</Text>
                {facture.session?.reference && <Text style={{ fontSize: 7, color: '#a8a29e', marginTop: 1 }}>Session {facture.session.reference}</Text>}
              </View>
              <Text style={{ ...shared.tableCell, width: 70, textAlign: 'right' }}>{fmt(facture.montant_ht)} €</Text>
            </View>
          </View>
        </View>

        {/* Totaux */}
        <View style={shared.totalsBox}>
          <View style={shared.totalRow}>
            <Text style={shared.totalLabel}>Total HT</Text>
            <Text style={shared.totalValue}>{fmt(facture.montant_ht)} €</Text>
          </View>
          <View style={shared.totalRow}>
            <Text style={shared.totalLabel}>TVA ({fmt(tauxTva)}%)</Text>
            <Text style={shared.totalValue}>{fmt(facture.montant_tva)} €</Text>
          </View>
          <View style={{ ...shared.totalRow, marginTop: 4 }}>
            <Text style={shared.totalTTCLabel}>Total TTC</Text>
            <Text style={shared.totalTTCValue}>{fmt(facture.montant_ttc)} €</Text>
          </View>
        </View>

        {/* Mentions */}
        <View style={{ ...shared.infoBox, marginTop: 8 }}>
          <Text style={{ fontSize: 7, color: '#78716c', lineHeight: 1.5 }}>
            {tauxTva === 0
              ? 'TVA non applicable, art. 293 B du Code général des impôts (franchise en base) ou art. 261-4-4° a (formation professionnelle continue), selon le régime de l\'émetteur.\n'
              : 'TVA acquittée sur les encaissements (prestations de services).\n'}
            Facture de prestation adressée à l'organisme de formation dans le cadre d'une sous-traitance pédagogique.
          </Text>
        </View>

        <PdfDocFooter numero={numAffiche} org={org} />
      </Page>
    </Document>
  )
}
