import {
  Document, Page, View, Text, StyleSheet, Font,
} from '@react-pdf/renderer'

// ─── Branding ────────────────────────────────────────────────────────────────
export const BRAND_GREEN = '#195144'
export const BRAND_LIGHT = '#e8f3f0'
export const SURFACE_500 = '#78716C'
export const SURFACE_700 = '#44403C'
export const SURFACE_900 = '#1C1917'

// ─── Shared Styles ────────────────────────────────────────────────────────────
export const shared = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: SURFACE_900,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_GREEN,
  },
  orgName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
  },
  orgTagline: {
    fontSize: 8,
    color: SURFACE_500,
    marginTop: 2,
  },
  qualiopiTag: {
    fontSize: 7,
    color: BRAND_GREEN,
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  docTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
    textAlign: 'right',
  },
  docMeta: {
    fontSize: 8,
    color: SURFACE_500,
    textAlign: 'right',
    marginTop: 2,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND_LIGHT,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    fontSize: 8,
    color: SURFACE_500,
    width: 110,
  },
  value: {
    fontSize: 8,
    color: SURFACE_900,
    flex: 1,
  },
  // Table
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND_GREEN,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e7e5e4',
  },
  tableRowAlt: {
    backgroundColor: '#fafaf9',
  },
  tableCell: {
    fontSize: 8,
    color: SURFACE_700,
  },
  // Totals
  totalsBox: {
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 8,
    color: SURFACE_500,
    width: 120,
    textAlign: 'right',
    marginRight: 12,
  },
  totalValue: {
    fontSize: 8,
    color: SURFACE_900,
    width: 80,
    textAlign: 'right',
  },
  totalTTCLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
    width: 120,
    textAlign: 'right',
    marginRight: 12,
  },
  totalTTCValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
    width: 80,
    textAlign: 'right',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 45,
    right: 45,
    borderTopWidth: 0.5,
    borderTopColor: '#d6d3d1',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: SURFACE_500,
  },
  // Info box
  infoBox: {
    backgroundColor: BRAND_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_GREEN,
    padding: 10,
    marginBottom: 16,
  },
  infoBoxText: {
    fontSize: 8,
    color: SURFACE_700,
  },
})

// ─── Shared Header Component ─────────────────────────────────────────────────
export function PdfDocHeader({
  docTitle,
  numero,
  date,
  statut,
}: {
  docTitle: string
  numero: string
  date: string
  statut?: string
}) {
  return (
    <View style={shared.header}>
      <View>
        <Text style={shared.orgName}>Lab Learning</Text>
        <Text style={shared.orgTagline}>Organisme de formation professionnelle</Text>
        <Text style={shared.qualiopiTag}>Certifié Qualiopi</Text>
      </View>
      <View>
        <Text style={shared.docTitle}>{docTitle}</Text>
        <Text style={shared.docMeta}>{numero}</Text>
        <Text style={shared.docMeta}>{date}</Text>
        {statut && <Text style={shared.docMeta}>{statut}</Text>}
      </View>
    </View>
  )
}

// ─── Shared Footer ────────────────────────────────────────────────────────────
export function PdfDocFooter({ numero }: { numero: string }) {
  return (
    <View style={shared.footer} fixed>
      <Text style={shared.footerText}>Lab Learning — digital@lab-learning.fr</Text>
      <Text style={shared.footerText}>{numero}</Text>
      <Text
        style={shared.footerText}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}
