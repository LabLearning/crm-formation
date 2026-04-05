import { Document, Page, View, Text } from '@react-pdf/renderer'
import { shared, PdfDocHeader, PdfDocFooter, BRAND_GREEN } from './components'
import type { Devis } from '@/lib/types/dossier'

function fmt(n: number | string | null | undefined): string {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
}

export function DevisPDF({ devis }: { devis: Devis }) {
  const clientName = devis.client?.raison_sociale
    || (devis.client?.nom ? `${devis.client.prenom || ''} ${devis.client.nom}`.trim() : '—')

  const lignes = devis.lignes || []

  return (
    <Document title={`Devis ${devis.numero}`} author="Lab Learning">
      <Page size="A4" style={shared.page}>
        <PdfDocHeader
          docTitle="DEVIS"
          numero={devis.numero}
          date={`Émis le ${fmtDate(devis.date_emission)}`}
          statut={STATUS_LABELS[devis.status] || devis.status}
        />

        {/* Client + Validity */}
        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
          <View style={{ flex: 1, ...shared.section }}>
            <Text style={shared.sectionTitle}>Destinataire</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>{clientName}</Text>
            {devis.contact && (
              <Text style={{ fontSize: 8, color: '#78716C' }}>
                {devis.contact.prenom} {devis.contact.nom}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, ...shared.section }}>
            <Text style={shared.sectionTitle}>Validité</Text>
            <View style={shared.row}>
              <Text style={shared.label}>Date d'émission</Text>
              <Text style={shared.value}>{fmtDate(devis.date_emission)}</Text>
            </View>
            <View style={shared.row}>
              <Text style={shared.label}>Valide jusqu'au</Text>
              <Text style={shared.value}>{fmtDate(devis.date_validite)}</Text>
            </View>
            {devis.date_acceptation && (
              <View style={shared.row}>
                <Text style={shared.label}>Accepté le</Text>
                <Text style={shared.value}>{fmtDate(devis.date_acceptation)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Object */}
        {devis.objet && (
          <View style={{ ...shared.infoBox, marginBottom: 18 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>Objet</Text>
            <Text style={shared.infoBoxText}>{devis.objet}</Text>
          </View>
        )}

        {/* Lines table */}
        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Prestations</Text>
          <View style={shared.table}>
            <View style={shared.tableHeader}>
              <Text style={{ ...shared.tableHeaderCell, flex: 4 }}>Désignation</Text>
              <Text style={{ ...shared.tableHeaderCell, width: 50, textAlign: 'right' }}>Qté</Text>
              <Text style={{ ...shared.tableHeaderCell, width: 50, textAlign: 'right' }}>Unité</Text>
              <Text style={{ ...shared.tableHeaderCell, width: 70, textAlign: 'right' }}>PU HT</Text>
              <Text style={{ ...shared.tableHeaderCell, width: 70, textAlign: 'right' }}>Total HT</Text>
            </View>
            {lignes.length > 0 ? (
              lignes.map((l, i) => (
                <View key={l.id} style={[shared.tableRow, i % 2 === 1 ? shared.tableRowAlt : {}]}>
                  <View style={{ flex: 4 }}>
                    <Text style={shared.tableCell}>{l.designation}</Text>
                    {l.description && (
                      <Text style={{ fontSize: 7, color: '#a8a29e', marginTop: 1 }}>{l.description}</Text>
                    )}
                  </View>
                  <Text style={{ ...shared.tableCell, width: 50, textAlign: 'right' }}>{l.quantite}</Text>
                  <Text style={{ ...shared.tableCell, width: 50, textAlign: 'right' }}>{l.unite}</Text>
                  <Text style={{ ...shared.tableCell, width: 70, textAlign: 'right' }}>{fmt(l.prix_unitaire_ht)} €</Text>
                  <Text style={{ ...shared.tableCell, width: 70, textAlign: 'right' }}>{fmt(l.montant_ht)} €</Text>
                </View>
              ))
            ) : (
              <View style={shared.tableRow}>
                <Text style={{ ...shared.tableCell, flex: 1, color: '#a8a29e' }}>
                  {devis.formation?.intitule || devis.objet || 'Prestation de formation'}
                </Text>
                <Text style={{ ...shared.tableCell, width: 70, textAlign: 'right' }}>{fmt(devis.montant_ht)} €</Text>
              </View>
            )}
          </View>
        </View>

        {/* Totals */}
        <View style={shared.totalsBox}>
          {devis.remise_montant > 0 && (
            <View style={shared.totalRow}>
              <Text style={shared.totalLabel}>Sous-total HT</Text>
              <Text style={shared.totalValue}>{fmt(Number(devis.montant_ht) + Number(devis.remise_montant))} €</Text>
            </View>
          )}
          {devis.remise_montant > 0 && (
            <View style={shared.totalRow}>
              <Text style={shared.totalLabel}>Remise ({devis.remise_pourcent}%)</Text>
              <Text style={shared.totalValue}>- {fmt(devis.remise_montant)} €</Text>
            </View>
          )}
          <View style={shared.totalRow}>
            <Text style={shared.totalLabel}>Total HT</Text>
            <Text style={shared.totalValue}>{fmt(devis.montant_ht)} €</Text>
          </View>
          <View style={shared.totalRow}>
            <Text style={shared.totalLabel}>TVA ({devis.taux_tva}%)</Text>
            <Text style={shared.totalValue}>{fmt(devis.montant_tva)} €</Text>
          </View>
          <View style={{ ...shared.totalRow, marginTop: 4 }}>
            <Text style={shared.totalTTCLabel}>Total TTC</Text>
            <Text style={shared.totalTTCValue}>{fmt(devis.montant_ttc)} €</Text>
          </View>
        </View>

        {/* Conditions */}
        {devis.conditions_particulieres && (
          <View style={shared.section}>
            <Text style={shared.sectionTitle}>Conditions particulières</Text>
            <Text style={{ fontSize: 8, color: '#57534e', lineHeight: 1.5 }}>{devis.conditions_particulieres}</Text>
          </View>
        )}

        {/* Legal footer note */}
        <View style={{ ...shared.infoBox, marginTop: 8 }}>
          <Text style={{ fontSize: 7, color: '#78716c' }}>
            Devis valable jusqu'au {fmtDate(devis.date_validite)}. TVA non applicable selon l'article 261.4.4° du CGI pour les actions de formation professionnelle continue.
          </Text>
        </View>

        <PdfDocFooter numero={devis.numero} />
      </Page>
    </Document>
  )
}
