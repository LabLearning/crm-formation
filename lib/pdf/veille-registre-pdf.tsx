import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_500, SURFACE_700, SURFACE_900, SURFACE_200 } from './components'

/**
 * Registre de veille (critère 6 — indicateurs 23, 24, 25 et veille handicap) :
 * chaque entrée porte sa date, sa source et surtout l'ACTION CONCRÈTE datée
 * qui en a découlé — c'est l'exploitation de la veille qui est auditée, pas
 * sa collecte.
 */
export interface EntreeVeille {
  type: string
  titre: string
  date_veille: string | null
  source: string | null
  resume: string | null
  action: string | null
}

const TYPES: Array<[string, string]> = [
  ['legale', 'Veille légale et réglementaire (indicateur 23)'],
  ['metier', 'Veille métiers et emplois (indicateur 24)'],
  ['pedagogique', 'Veille pédagogique et technologique (indicateur 25)'],
  ['handicap', 'Veille handicap (appui indicateur 26)'],
]

const fdate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export function VeilleRegistrePDF({ org, entrees, dateEdition }: { org: any; entrees: EntreeVeille[]; dateEdition: string }) {
  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Registre de veille" numero={`${entrees.length} entrées`} date={dateEdition} org={org} />
        <Text style={{ fontSize: 8.5, color: SURFACE_500, marginTop: 6, marginBottom: 4, lineHeight: 1.5 }}>
          Chaque entrée est datée, sourcée, et suivie de l&apos;action concrète menée (ou programmée avec son échéance).
          Le registre vivant est tenu dans le CRM (Qualité → Veille) ; ce document en est l&apos;édition du jour.
        </Text>
        {TYPES.map(([type, label]) => {
          const lignes = entrees.filter((e) => e.type === type)
          if (!lignes.length) return null
          return (
            <View key={type} style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 10.5, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN, marginBottom: 4 }}>
                {label}
              </Text>
              {lignes.map((e, i) => (
                <View key={i} wrap={false} style={{ borderBottomWidth: 0.5, borderBottomColor: SURFACE_200, paddingVertical: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 8.5, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, flex: 1, paddingRight: 8 }}>
                      {e.titre}
                    </Text>
                    <Text style={{ fontSize: 7.5, color: SURFACE_500 }}>{fdate(e.date_veille)}</Text>
                  </View>
                  {e.source ? (
                    <Text style={{ fontSize: 7.5, color: SURFACE_500, marginTop: 1 }}>Source : {e.source}</Text>
                  ) : null}
                  {e.resume ? (
                    <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.45, marginTop: 2 }}>{e.resume}</Text>
                  ) : null}
                  {e.action ? (
                    <Text style={{ fontSize: 8, color: SURFACE_900, lineHeight: 1.45, marginTop: 2 }}>
                      <Text style={{ fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN }}>Action : </Text>
                      {e.action}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )
        })}
        <PdfDocFooter numero="Registre de veille" org={org} />
      </Page>
    </Document>
  )
}
