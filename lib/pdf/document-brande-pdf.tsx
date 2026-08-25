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
export interface EtapeProcess {
  numero?: number
  titre: string
  details?: string[]
  /** Point de contrôle critique : badge rouge sur la carte d'étape. */
  ccp?: string | null
}

export interface SectionBrandee {
  titre?: string
  type?: 'paragraphes' | 'liste' | 'tableau' | 'etapes'
  paragraphes?: string[]
  items?: string[]
  colonnes?: string[]
  lignes?: string[][]
  etapes?: EtapeProcess[]
}

export interface DocumentBrande {
  titre: string
  sous_titre?: string
  sections: SectionBrandee[]
}

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 58, paddingHorizontal: 0, fontSize: 9.5, fontFamily: 'Satoshi', color: SURFACE_900 },
})

/** Luminance perçue 0-1 : décide de l'encre (blanc ou sombre) sur la couleur. */
function luminance(hexCouleur: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hexCouleur)
  if (!m) return 0
  const n = parseInt(m[1], 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

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

export function DocumentBrandePDF({ doc, franchiseNom, logoUrl, couleur, couleur2, formateurNom, dateStr, labLogoUrl, paysage }: {
  doc: DocumentBrande
  franchiseNom: string
  logoUrl?: string | null
  couleur: string
  couleur2?: string | null
  formateurNom?: string | null
  dateStr: string
  /** Logo Lab Learning (variante sombre) pour le footer. */
  labLogoUrl?: string | null
  /** Orientation héritée du document source (organigrammes, plannings larges). */
  paysage?: boolean
}) {
  const accent = couleur || '#195144'
  const accent2 = couleur2 || fonce(accent, 1.25)
  const claire = luminance(accent) > 0.6
  // Marque claire (jaune, orange vif…) : bandeaux encrés sombre, fonds plus
  // profonds pour garder du blanc lisible sur les en-têtes de tableaux.
  const sombre = fonce(accent, claire ? 0.42 : 0.72)
  const encre = claire ? '#1C1917' : '#FFFFFF'
  const CCP_ROUGE = '#B91C1C'
  const sections = (doc.sections || []).filter((sec) =>
    (sec.paragraphes || []).length || (sec.items || []).length ||
    (sec.colonnes && sec.lignes && sec.lignes.length) || (sec.etapes || []).length)

  return (
    <Document>
      <Page size="A4" orientation={paysage ? 'landscape' : 'portrait'} style={s.page}>
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
              <Text style={{ fontSize: 9, fontWeight: 700, color: encre, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1.8 }}>
                {franchiseNom}
              </Text>
              <Text style={{ fontSize: 23, fontWeight: 900, color: encre, marginTop: 7, lineHeight: 1.12 }}>{doc.titre}</Text>
              {doc.sous_titre ? (
                <Text style={{ fontSize: 10, color: encre, opacity: 0.85, marginTop: 6, lineHeight: 1.4 }}>{doc.sous_titre}</Text>
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
          {sections.map((sec, i) => (
            <View key={i} wrap={false} style={{ marginBottom: 16 }}>
              {sec.titre ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: 900, color: encre }}>{i + 1}</Text>
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

              {(sec.etapes || []).length > 0 ? (
                <View>
                  {(sec.etapes || []).map((e, j) => (
                    <View key={j} wrap={false} style={{ flexDirection: 'row', borderWidth: 0.75, borderColor: SURFACE_200, borderRadius: 8, padding: 9, marginBottom: 6, backgroundColor: j % 2 ? '#FAFAF9' : '#FFFFFF' }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: sombre, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: 900, color: '#FFFFFF' }}>{e.numero ?? j + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: 700, color: SURFACE_900 }}>{e.titre}</Text>
                        {(e.details || []).map((d, k) => (
                          <Text key={k} style={{ fontSize: 8.8, lineHeight: 1.5, color: SURFACE_700, marginTop: 1.5 }}>{d}</Text>
                        ))}
                        {e.ccp ? (
                          <View style={{ alignSelf: 'flex-start', backgroundColor: CCP_ROUGE, borderRadius: 4, paddingVertical: 2.5, paddingHorizontal: 6, marginTop: 4 }}>
                            <Text style={{ fontSize: 7.5, fontWeight: 700, color: '#FFFFFF' }}>CCP — {e.ccp}</Text>
                          </View>
                        ) : null}
                      </View>
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
