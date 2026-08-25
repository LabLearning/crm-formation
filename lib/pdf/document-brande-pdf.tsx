import * as React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'

/**
 * Document brandé du studio formateur : le contenu structuré par l'IA, mis en
 * page aux couleurs de la franchise (bandeau, titres, accents) avec son logo.
 * Structure volontairement générique : paragraphes, listes, tableaux.
 */
export interface SectionBrandee {
  titre?: string
  type?: 'paragraphes' | 'liste' | 'tableau'
  paragraphes?: string[]
  items?: string[]
  colonnes?: string[]
  lignes?: string[][]
}

export interface DocumentBrande {
  titre: string
  sous_titre?: string
  sections: SectionBrandee[]
}

Font.register({
  family: 'Satoshi',
  fonts: [
    { src: 'https://cdn.fontshare.com/wf/P2LQKHE6KA6ZP4AAGN72KDWMHH6ZH3TA/ZC32TK2P7FPS5GFTL46EU6KQJA24ZYDB/7QYRJOI3JIMYHGY6CH7SOIFRQLZOLNJ6.ttf', fontWeight: 400 },
    { src: 'https://cdn.fontshare.com/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.ttf', fontWeight: 700 },
  ],
})

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 48, paddingHorizontal: 0, fontSize: 9.5, fontFamily: 'Helvetica', color: '#1C1917' },
  bandeau: { paddingHorizontal: 36, paddingTop: 26, paddingBottom: 20 },
  corps: { paddingHorizontal: 36, paddingTop: 18 },
})

export function DocumentBrandePDF({ doc, franchiseNom, logoUrl, couleur, couleur2, formateurNom, dateStr }: {
  doc: DocumentBrande
  franchiseNom: string
  logoUrl?: string | null
  couleur: string
  couleur2?: string | null
  formateurNom?: string | null
  dateStr: string
}) {
  const accent = couleur || '#195144'
  const accent2 = couleur2 || accent
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Bandeau aux couleurs de la franchise */}
        <View style={{ ...s.bandeau, backgroundColor: accent }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ fontSize: 8, color: '#FFFFFF', opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1.5 }}>{franchiseNom}</Text>
              <Text style={{ fontSize: 19, fontFamily: 'Satoshi', fontWeight: 700, color: '#FFFFFF', marginTop: 5, lineHeight: 1.15 }}>{doc.titre}</Text>
              {doc.sous_titre ? <Text style={{ fontSize: 9.5, color: '#FFFFFF', opacity: 0.85, marginTop: 4 }}>{doc.sous_titre}</Text> : null}
            </View>
            {logoUrl ? (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 7 }}>
                <Image src={logoUrl} style={{ width: 62, height: 42, objectFit: 'contain' }} />
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ height: 4, backgroundColor: accent2 }} />

        <View style={s.corps}>
          {doc.sections.map((sec, i) => (
            <View key={i} wrap={false} style={{ marginBottom: 14 }}>
              {sec.titre ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ width: 3.5, height: 13, backgroundColor: accent, borderRadius: 2, marginRight: 6 }} />
                  <Text style={{ fontSize: 11.5, fontFamily: 'Satoshi', fontWeight: 700, color: accent }}>{sec.titre}</Text>
                </View>
              ) : null}
              {(sec.paragraphes || []).map((p, j) => (
                <Text key={j} style={{ fontSize: 9.5, lineHeight: 1.55, color: '#44403C', marginBottom: 4 }}>{p}</Text>
              ))}
              {(sec.items || []).map((it, j) => (
                <View key={j} style={{ flexDirection: 'row', marginBottom: 3, paddingLeft: 2 }}>
                  <Text style={{ color: accent2, marginRight: 5, fontSize: 9.5 }}>•</Text>
                  <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.5, color: '#44403C' }}>{it}</Text>
                </View>
              ))}
              {sec.colonnes && sec.lignes ? (
                <View style={{ marginTop: 4, borderWidth: 0.5, borderColor: '#E7E5E4', borderRadius: 4 }}>
                  <View style={{ flexDirection: 'row', backgroundColor: accent }}>
                    {sec.colonnes.map((c, j) => (
                      <Text key={j} style={{ flex: 1, fontSize: 8.5, fontFamily: 'Satoshi', fontWeight: 700, color: '#FFFFFF', padding: 5 }}>{c}</Text>
                    ))}
                  </View>
                  {sec.lignes.map((l, j) => (
                    <View key={j} style={{ flexDirection: 'row', backgroundColor: j % 2 ? '#FAFAF9' : '#FFFFFF' }}>
                      {(sec.colonnes || []).map((_, k) => (
                        <Text key={k} style={{ flex: 1, fontSize: 8.5, color: '#44403C', padding: 5 }}>{l[k] || ''}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* Pied : réalisation Lab Learning */}
        <View fixed style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 0.5, borderTopColor: '#E7E5E4', paddingVertical: 10, paddingHorizontal: 36, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 7.5, color: '#A8A29E' }}>
            Document réalisé par Lab Learning pour {franchiseNom}{formateurNom ? ` — formateur : ${formateurNom}` : ''}
          </Text>
          <Text style={{ fontSize: 7.5, color: '#A8A29E' }}>{dateStr}</Text>
        </View>
      </Page>
    </Document>
  )
}
