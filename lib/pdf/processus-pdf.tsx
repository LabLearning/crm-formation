import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfSectionTitle, PdfDocHeader, PdfDocFooter, shared, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

export interface SectionProcessus {
  titre: string
  paragraphes?: string[]
  etapes?: { quand: string; quoi: string; outil?: string }[]
}

/**
 * Document de processus interne (procédures Qualiopi) : des étapes datées,
 * chacune rattachée à l'outil qui en garde la trace — un processus sans trace
 * n'est qu'une intention.
 */
export function ProcessusPDF({ org, titre, reference, intro, sections }: {
  org: any
  titre: string
  reference: string
  intro: string
  sections: SectionProcessus[]
}) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle={titre} numero={reference} org={org} />

        <View style={shared.infoBox}>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>{intro}</Text>
        </View>

        {sections.map((s) => (
          <View key={s.titre} style={shared.section} wrap={false}>
            <PdfSectionTitle>{s.titre}</PdfSectionTitle>
            {(s.paragraphes || []).map((p, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: SURFACE_900, lineHeight: 1.6, marginBottom: 4 }}>{p}</Text>
            ))}
            {(s.etapes || []).map((e, i) => (
              <View key={i} style={{ flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.4, borderBottomColor: '#efedea' }}>
                <Text style={{ width: 120, fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900 }}>{e.quand}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 8.5, color: SURFACE_900, lineHeight: 1.5 }}>{e.quoi}</Text>
                  {e.outil ? <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 1 }}>Trace : {e.outil}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ))}

        <PdfDocFooter numero={reference} org={org} />
      </Page>
    </Document>
  )
}
