import * as React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Svg, Polygon } from '@react-pdf/renderer'
// Réutilise l'enregistrement de police éprouvé (Satoshi 400/500/700/900)
import { SURFACE_200, SURFACE_400, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'
import { IconePdf } from './pdf-icones'

/**
 * Document brandé du studio formateur — principe « un seul accent » : la
 * couleur de la franchise ne sert jamais de fond à un aplat de texte, elle
 * ponctue (kicker, filets, chips, icônes, chiffres) sur une couverture noire
 * de marque. Encarts crème, tableaux à en-tête noir, badges CCP rouges,
 * bande hachurée signature. Structure générique produite par l'IA.
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
  /** Nom d'icône métier (temperature, controle, cuisson, froid, stockage…). */
  icone?: string | null
  /** Ton visuel : attention = encart ambre, critique = encart rouge. */
  ton?: 'normal' | 'attention' | 'critique' | null
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
  /** 2-3 étiquettes de couverture (ex. HACCP, Hygiène, Service). */
  etiquettes?: string[]
  sections: SectionBrandee[]
}

const NOIR = '#0B0C0E'
const CREME = '#FAF6EC'
const CCP_ROUGE = '#B91C1C'

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

/** Assombrit (facteur < 1) ou éclaircit (facteur > 1) une couleur hex. */
function fonce(hexCouleur: string, facteur = 0.72): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hexCouleur)
  if (!m) return hexCouleur
  const n = parseInt(m[1], 16)
  const r = Math.min(255, Math.round(((n >> 16) & 255) * facteur))
  const g = Math.min(255, Math.round(((n >> 8) & 255) * facteur))
  const b = Math.min(255, Math.round((n & 255) * facteur))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** Bande hachurée signature : diagonales accent sur fond noir. */
function Hachures({ couleur, hauteur, largeur }: { couleur: string; hauteur: number; largeur: number }) {
  const pas = hauteur * 2.4
  const bandes: React.ReactElement[] = []
  for (let x = -hauteur; x < largeur + hauteur; x += pas) {
    bandes.push(
      <Polygon key={x} points={`${x},${hauteur} ${x + pas / 2},${hauteur} ${x + pas / 2 + hauteur},0 ${x + hauteur},0`} fill={couleur} />,
    )
  }
  return (
    <View style={{ height: hauteur, backgroundColor: NOIR }}>
      <Svg width="100%" height={hauteur} viewBox={`0 0 ${largeur} ${hauteur}`} preserveAspectRatio="none">
        {bandes}
      </Svg>
    </View>
  )
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
  // Sur fond noir, un accent trop sombre disparaît : on l'éclaircit d'office.
  const accentPop = luminance(accent) < 0.22 ? fonce(accent, 1.9) : accent
  const largeurPage = paysage ? 842 : 595
  const sections = (doc.sections || []).filter((sec) =>
    (sec.paragraphes || []).length || (sec.items || []).length ||
    (sec.colonnes && sec.lignes && sec.lignes.length) || (sec.etapes || []).length)

  return (
    <Document>
      <Page size="A4" orientation={paysage ? 'landscape' : 'portrait'} style={s.page}>
        {/* ── Couverture noire de marque : l'accent ponctue, jamais en aplat ── */}
        <Hachures couleur={accentPop} hauteur={9} largeur={largeurPage} />
        <View style={{ backgroundColor: NOIR, paddingHorizontal: 40, paddingTop: 24, paddingBottom: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 7.5, color: accentPop, textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: 700 }}>
              Document de formation
            </Text>
            <Text style={{ fontSize: 7.5, color: '#9A9EA5' }}>{dateStr}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 18 }}>
              <Text style={{ fontSize: 9, fontWeight: 700, color: accentPop, textTransform: 'uppercase', letterSpacing: 2 }}>
                {franchiseNom}
              </Text>
              <Text style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', marginTop: 7, lineHeight: 1.1 }}>{doc.titre}</Text>
              {doc.sous_titre ? (
                <Text style={{ fontSize: 10, color: '#C7C9CD', marginTop: 6, lineHeight: 1.4 }}>{doc.sous_titre}</Text>
              ) : null}
              <View style={{ width: 30, height: 3, backgroundColor: accentPop, marginTop: 12 }} />
              {(doc.etiquettes || []).length > 0 ? (
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  {(doc.etiquettes || []).slice(0, 3).map((t, k) => (
                    <View key={k} style={{ borderWidth: 1, borderColor: accentPop, borderRadius: 10, paddingVertical: 2.5, paddingHorizontal: 9, marginRight: 5 }}>
                      <Text style={{ fontSize: 7.5, fontWeight: 700, color: accentPop, textTransform: 'uppercase', letterSpacing: 1 }}>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            {logoUrl ? (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10 }}>
                <Image src={logoUrl} style={{ width: 72, height: 50, objectFit: 'contain' }} />
              </View>
            ) : null}
          </View>
        </View>
        <Hachures couleur={accentPop} hauteur={4} largeur={largeurPage} />

        {/* ── Corps ── */}
        <View style={{ paddingHorizontal: 40, paddingTop: 22 }}>
          {sections.map((sec, i) => (
            <View key={i} style={{ marginBottom: 16 }}>
              {sec.titre ? (
                <View wrap={false} minPresenceAhead={85} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: sec.ton === 'critique' ? CCP_ROUGE : NOIR, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <IconePdf nom={sec.icone} taille={13} couleur={sec.ton === 'critique' ? '#FFFFFF' : accentPop} />
                  </View>
                  <Text style={{ fontSize: 12.5, fontWeight: 700, color: SURFACE_900, flexShrink: 1 }}>{sec.titre}</Text>
                  <View style={{ flex: 1, height: 0.75, backgroundColor: '#E4E0D6', marginLeft: 10 }} />
                  <Text style={{ fontSize: 8, fontWeight: 900, color: SURFACE_400, marginLeft: 8 }}>{String(i + 1).padStart(2, '0')}</Text>
                </View>
              ) : null}

              {(sec.paragraphes || []).map((p, j) => (
                <Text key={j} style={{ fontSize: 9.5, lineHeight: 1.6, color: SURFACE_700, marginBottom: 5 }}>{p}</Text>
              ))}

              {(sec.items || []).length > 0 ? (() => {
                const items = sec.items || []
                const puceCouleur = sec.ton === 'critique' ? CCP_ROUGE : sec.ton === 'attention' ? '#D97706' : accent
                const fond = sec.ton === 'critique' ? '#FEF2F2' : sec.ton === 'attention' ? '#FFFBEB' : CREME
                // Beaucoup d'items courts (check-list) : deux colonnes équilibrées
                const deuxColonnes = items.length >= 6 && items.every((it) => it.length <= 60)
                const moitie = Math.ceil(items.length / 2)
                const colonnes = deuxColonnes ? [items.slice(0, moitie), items.slice(moitie)] : [items]
                return (
                  <View minPresenceAhead={40} style={{ backgroundColor: fond, borderRadius: 8, padding: 10, borderWidth: 0.75, borderColor: '#E4E0D6', flexDirection: 'row' }}>
                    {colonnes.map((col, c) => (
                      <View key={c} style={{ flex: 1, paddingRight: c === 0 && deuxColonnes ? 10 : 0 }}>
                        {col.map((it, j) => (
                          <View key={j} style={{ flexDirection: 'row', marginBottom: j === col.length - 1 ? 0 : 5 }}>
                            <View style={{ width: 5.5, height: 5.5, borderRadius: 1.5, backgroundColor: puceCouleur, marginTop: 3.5, marginRight: 7 }} />
                            <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.5, color: '#33373E' }}>{it}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )
              })() : null}

              {sec.colonnes && sec.lignes ? (
                <View style={{ marginTop: 5, borderRadius: 8, overflow: 'hidden', borderWidth: 0.75, borderColor: '#E4E0D6' }}>
                  <View minPresenceAhead={50} style={{ flexDirection: 'row', backgroundColor: NOIR }}>
                    {sec.colonnes.map((c, j) => (
                      <Text key={j} style={{ flex: sec.colonnes!.length === 2 && j === 0 ? 1 : sec.colonnes!.length === 2 ? 2.4 : 1, fontSize: 8.5, fontWeight: 700, color: accentPop, paddingVertical: 7, paddingHorizontal: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c}</Text>
                    ))}
                  </View>
                  {sec.lignes.map((l, j) => (
                    <View key={j} wrap={false} style={{ flexDirection: 'row', backgroundColor: j % 2 ? CREME : '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#E4E0D6' }}>
                      {(sec.colonnes || []).map((_, k) => (
                        <Text key={k} style={{ flex: (sec.colonnes || []).length === 2 && k === 0 ? 1 : (sec.colonnes || []).length === 2 ? 2.4 : 1, fontSize: 8.5, lineHeight: 1.45, color: '#33373E', paddingVertical: 6, paddingHorizontal: 9 }}>{l[k] || ''}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}

              {(sec.etapes || []).length > 0 ? (
                <View>
                  {(sec.etapes || []).map((e, j) => (
                    <View key={j} wrap={false} style={{ paddingTop: j > 0 ? 9 : 0 }}>
                    {j > 0 ? (
                      <View style={{ position: 'absolute', top: 1, left: 0, right: 0, alignItems: 'center' }}>
                        <Svg width={10} height={6} viewBox="0 0 10 6">
                          <Polygon points="0,0 10,0 5,6" fill="#C9C4B8" />
                        </Svg>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', borderWidth: 0.75, borderColor: '#E4E0D6', borderRadius: 8, padding: 9, marginBottom: 4, backgroundColor: j % 2 ? CREME : '#FFFFFF' }}>
                      <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: NOIR, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: 900, color: accentPop }}>{e.numero ?? j + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: 700, color: SURFACE_900 }}>{e.titre}</Text>
                        {(e.details || []).map((d, k) => (
                          <Text key={k} style={{ fontSize: 8.8, lineHeight: 1.55, color: '#33373E', marginTop: 2 }}>{d}</Text>
                        ))}
                        {e.ccp ? (
                          <View style={{ alignSelf: 'flex-start', backgroundColor: CCP_ROUGE, borderRadius: 4, paddingVertical: 2.5, paddingHorizontal: 6, marginTop: 4 }}>
                            <Text style={{ fontSize: 7.5, fontWeight: 700, color: '#FFFFFF' }}>{`CCP — ${String(e.ccp).replace(/^CCP\s*(CRITIQUE)?\s*[:—–-]\s*/i, '')}`}</Text>
                          </View>
                        ) : null}
                      </View>
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
              <Text style={{ fontSize: 7, color: '#9A9EA5' }}>
                {`Réalisé pour ${franchiseNom}${formateurNom ? ` — ${formateurNom}` : ''}`}
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
