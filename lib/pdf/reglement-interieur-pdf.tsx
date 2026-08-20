import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_700, SURFACE_900 } from './components'
import { RI_BLOCS, RI_VERSION } from '@/app/site/reglement-interieur/contenu'

/**
 * Règlement intérieur applicable aux stagiaires — PDF téléchargeable depuis
 * le site public et le portail apprenant. Même source que la page web
 * (app/site/reglement-interieur/contenu.ts) : jamais deux versions.
 */
export function ReglementInterieurPDF({ org, dateEdition }: { org: any; dateEdition: string }) {
  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Règlement intérieur applicable aux stagiaires" numero={RI_VERSION} date={dateEdition} org={org} />
        <View style={{ marginTop: 10 }}>
          {RI_BLOCS.map((b, i) => {
            if (b.t === 'h') {
              const estPartie = /^[IVX]+ — /.test(b.v)
              return (
                <Text key={i} style={{
                  fontSize: estPartie ? 11 : 9.5,
                  fontFamily: 'Satoshi', fontWeight: 700,
                  color: estPartie ? BRAND_GREEN : SURFACE_900,
                  marginTop: estPartie ? 12 : 8, marginBottom: 3,
                }}>
                  {b.v}
                </Text>
              )
            }
            if (b.t === 'ul') {
              return (
                <View key={i} style={{ marginBottom: 5 }}>
                  {b.v.map((li, j) => (
                    <View key={j} style={{ flexDirection: 'row', marginBottom: 1.5 }}>
                      <Text style={{ fontSize: 8.5, color: BRAND_GREEN, width: 10 }}>•</Text>
                      <Text style={{ fontSize: 8.5, color: SURFACE_700, lineHeight: 1.5, flex: 1 }}>{li}</Text>
                    </View>
                  ))}
                </View>
              )
            }
            return (
              <Text key={i} style={{ fontSize: 8.5, color: SURFACE_700, lineHeight: 1.55, marginBottom: 5 }}>
                {b.v}
              </Text>
            )
          })}
        </View>
        <PdfDocFooter numero={RI_VERSION} org={org} />
      </Page>
    </Document>
  )
}
