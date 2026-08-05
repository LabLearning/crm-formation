import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'

export interface PointageSession {
  date: string
  reference: string
  formation: string
  participants: { nom: string }[]
}

const GREEN = '#195144'
const INK = '#1c1917'
const SOFT = '#57534e'
const LINE = '#e2e0db'

const Box = () => <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: '#44403c', borderRadius: 2, marginRight: 4 }} />

/**
 * Feuille de pointage papier à imprimer : une section par session, chaque
 * participant avec une case « Présent » et une case « Absent » à cocher.
 * Sert à réconcilier la présence non saisie dans le CRM (indicateur 12).
 */
export function PointagePapierPDF({ sessions, orgName, editedOn }: { sessions: PointageSession[]; orgName: string; editedOn: string }) {
  return (
    <Document>
      <Page size="A4" style={{ paddingTop: 34, paddingBottom: 40, paddingHorizontal: 34, fontFamily: 'Helvetica', fontSize: 9, color: INK }}>
        {/* En-tête */}
        <View style={{ borderBottomWidth: 2, borderBottomColor: GREEN, paddingBottom: 8, marginBottom: 14 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: GREEN }}>Feuille de pointage — présences à confirmer</Text>
          <Text style={{ fontSize: 8.5, color: SOFT, marginTop: 3 }}>
            {orgName} · Cocher « Présent » ou « Absent » d'après l'émargement papier de chaque session, puis retourner ce document.
          </Text>
          <Text style={{ fontSize: 7.5, color: SOFT, marginTop: 2 }}>Édité le {editedOn} · {sessions.length} session(s) · {sessions.reduce((n, s) => n + s.participants.length, 0)} participant(s)</Text>
        </View>

        {sessions.map((s, si) => (
          <View key={si} wrap={false} style={{ marginBottom: 12, borderWidth: 0.5, borderColor: LINE, borderRadius: 4 }}>
            {/* Bandeau session */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f2f5f3', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: LINE }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: GREEN, fontSize: 9 }}>{s.date}  ·  {s.reference}</Text>
              <Text style={{ color: SOFT, fontSize: 8.5, maxWidth: 300, textAlign: 'right' }}>{s.formation}</Text>
            </View>
            {/* Lignes participants */}
            {s.participants.map((p, pi) => (
              <View key={pi} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: pi < s.participants.length - 1 ? 0.5 : 0, borderBottomColor: '#f0efec' }}>
                <Text style={{ flex: 1, fontSize: 9 }}>{p.nom}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', width: 70 }}><Box /><Text style={{ fontSize: 8.5 }}>Présent</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', width: 64 }}><Box /><Text style={{ fontSize: 8.5, color: '#b4241f' }}>Absent</Text></View>
                <Text style={{ width: 150, fontSize: 7.5, color: SOFT, borderBottomWidth: 0.5, borderBottomColor: LINE }}> </Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={{ position: 'absolute', bottom: 22, left: 34, right: 34, fontSize: 7, color: SOFT, textAlign: 'center' }}
          render={({ pageNumber, totalPages }) => `${orgName} — Feuille de pointage · page ${pageNumber}/${totalPages}`} fixed />
      </Page>
    </Document>
  )
}
