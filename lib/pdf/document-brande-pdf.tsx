import * as React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
// Réutilise l'enregistrement de police éprouvé (Satoshi 400/500/700/900)
import { SURFACE_200, SURFACE_400, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

/**
 * Document brandé du studio formateur — gabarit éditorial : bandeau de
 * couverture aux couleurs de la franchise (logo en carte), sections
 * numérotées, listes à puces carrées, tableaux zébrés, footer avec le logo
 * Lab Learning et la pagination. Structure générique produite par l'IA.
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

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 58, paddingHorizontal: 0, fontSize: 9.5, fontFamily: 'Satoshi', color: SURFACE_900 },
})

/** Assombrit légèrement une couleur hex — simule la profondeur du bandeau. */
function fonce(hexCouleur: string, facteur = 0.72): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hexCouleur)
  if (!m) return hexCouleur
  const n = parseInt(m[1], 16)
  const r = Math.round(((n >> 16) & 255) * facteur)
  const g = Math.round(((n >> 8) & 255) * facteur)
  const b = Math.round((n & 255) * facteur)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function DocumentBrandePDF({ doc, franchiseNom, logoUrl, couleur, couleur2, formateurNom, dateStr, labLogoUrl }: {
  doc: DocumentBrande
  franchiseNom: string
  logoUrl?: string | null
  couleur: string
  couleur2?: string | null
  formateurNom?: string | null
  dateStr: string
  /** Logo Lab Learning (variante sombre) pour le footer. */
  labLogoUrl?: string | null
}) {
  const accent = couleur || '#195144'
  const accent2 = couleur2 || fonce(accent, 1.25)
  const sombre = fonce(accent)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Couverture : double bande de couleur, logo en carte flottante ── */}
        <View style={{ backgroundColor: sombre, paddingHorizontal: 40, paddingTop: 30, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 7.5, color: '#FFFFFF', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: 500 }}>
              Document de formation
            </Text>
            <Text style={{ fontSize: 7.5, color: '#FFFFFF', opacity: 0.7 }}>{dateStr}</Text>
          </View>
        </View>
        <View style={{ backgroundColor: accent, paddingHorizontal: 40, paddingTop: 18, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 18 }}>
              <Text style={{ fontSize: 9, fontWeight: 700, color: '#FFFFFF', opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1.8 }}>
                {franchiseNom}
              </Text>
              <Text style={{ fontSize: 23, fontWeight: 900, color: '#FFFFFF', marginTop: 7, lineHeight: 1.12 }}>{doc.titre}</Text>
              {doc.sous_titre ? (
                <Text style={{ fontSize: 10, color: '#FFFFFF', opacity: 0.85, marginTop: 6, lineHeight: 1.4 }}>{doc.sous_titre}</Text>
              ) : null}
            </View>
            {logoUrl ? (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10 }}>
                <Image src={logoUrl} style={{ width: 74, height: 50, objectFit: 'contain' }} />
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, height: 5, backgroundColor: accent2 }} />
          <View style={{ flex: 2, height: 5, backgroundColor: sombre }} />
        </View>

        {/* ── Corps ── */}
        <View style={{ paddingHorizontal: 40, paddingTop: 22 }}>
          {doc.sections.map((sec, i) => (
            <View key={i} wrap={false} style={{ marginBottom: 16 }}>
              {sec.titre ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: 900, color: '#FFFFFF' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontSize: 12.5, fontWeight: 700, color: SURFACE_900 }}>{sec.titre}</Text>
                  <View style={{ flex: 1, height: 0.75, backgroundColor: SURFACE_200, marginLeft: 10 }} />
                </View>
              ) : null}

              {(sec.paragraphes || []).map((p, j) => (
                <Text key={j} style={{ fontSize: 9.5, lineHeight: 1.6, color: SURFACE_700, marginBottom: 5 }}>{p}</Text>
              ))}

              {(sec.items || []).length > 0 ? (
                <View style={{ backgroundColor: '#FAFAF9', borderRadius: 8, padding: 10, borderLeftWidth: 2.5, borderLeftColor: accent2 }}>
                  {(sec.items || []).map((it, j) => (
                    <View key={j} style={{ flexDirection: 'row', marginBottom: j === (sec.items || []).length - 1 ? 0 : 5 }}>
                      <View style={{ width: 5.5, height: 5.5, borderRadius: 1.5, backgroundColor: accent, marginTop: 3.5, marginRight: 7 }} />
                      <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.5, color: SURFACE_700 }}>{it}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {sec.colonnes && sec.lignes ? (
                <View style={{ marginTop: 5, borderRadius: 8, overflow: 'hidden', borderWidth: 0.75, borderColor: SURFACE_200 }}>
                  <View style={{ flexDirection: 'row', backgroundColor: sombre }}>
                    {sec.colonnes.map((c, j) => (
                      <Text key={j} style={{ flex: 1, fontSize: 8.5, fontWeight: 700, color: '#FFFFFF', paddingVertical: 7, paddingHorizontal: 8 }}>{c}</Text>
                    ))}
                  </View>
                  {sec.lignes.map((l, j) => (
                    <View key={j} style={{ flexDirection: 'row', backgroundColor: j % 2 ? '#FAFAF9' : '#FFFFFF', borderTopWidth: 0.5, borderTopColor: SURFACE_200 }}>
                      {(sec.colonnes || []).map((_, k) => (
                        <Text key={k} style={{ flex: 1, fontSize: 8.5, lineHeight: 1.45, color: SURFACE_700, paddingVertical: 6, paddingHorizontal: 8 }}>{l[k] || ''}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* ── Footer : logo Lab Learning + réalisation + pagination ── */}
        <View fixed style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <View style={{ height: 2.5, backgroundColor: accent, opacity: 0.9 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 40, backgroundColor: '#FFFFFF' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {labLogoUrl ? <Image src={labLogoUrl} style={{ height: 14, width: 52, objectFit: 'contain' }} /> : (
                <Text style={{ fontSize: 8.5, fontWeight: 900, color: SURFACE_900 }}>Lab Learning</Text>
              )}
              <View style={{ width: 0.75, height: 12, backgroundColor: SURFACE_200 }} />
              <Text style={{ fontSize: 7, color: SURFACE_400 }}>
                Réalisé pour {franchiseNom}{formateurNom ? ` — ${formateurNom}` : ''}
              </Text>
            </View>
            <Text style={{ fontSize: 7, color: SURFACE_500 }}
              render={({ pageNumber, totalPages }) => `${dateStr}  ·  ${pageNumber}/${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  )
}
