import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfSectionTitle, PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

interface Section { key: string; titre: string; items: { id: string; label: string }[] }

interface Props {
  org: any
  poei: any
  apprenant: any
  formateurNom: string | null
  semaine: number | null
  sections: Section[]
  items: Record<string, { n?: string; o?: string }>
  appreciations: Record<string, string>
  appreciationsMeta: { key: string; label: string }[]
  pointsForts?: string | null
  aRenforcer?: string | null
  recommandations?: string | null
  avisFinal?: string | null
  motivationAvis?: string | null
  conclusion?: string | null
  dureeRealisee?: string | null
  absences?: string | null
  dateEvaluation?: string | null
  statut?: string | null
}

const NIV: Record<string, { label: string; color: string }> = {
  A: { label: 'Acquis', color: '#177245' },
  EC: { label: 'En cours', color: '#b45309' },
  NA: { label: 'Non acquis', color: '#b4241f' },
}

/** Grille d'évaluation POEI d'un candidat (suivi hebdomadaire ou évaluation finale). */
export function GrillePoeiPDF(p: Props) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const dateAff = p.dateEvaluation ? new Date(p.dateEvaluation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : today
  const isFinale = p.semaine == null
  const nomAppr = `${p.apprenant?.prenom || ''} ${p.apprenant?.nom || ''}`.trim()
  const clientNom = p.poei?.client?.nom_commercial || p.poei?.client?.raison_sociale || ''
  const formationNom = p.poei?.formation?.intitule || p.poei?.poste_vise || ''

  const evalues = p.sections.flatMap((s) => s.items).filter((i) => p.items?.[i.id]?.n)
  const acquis = evalues.filter((i) => p.items[i.id].n === 'A').length

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader
          docTitle={isFinale ? "Grille d'évaluation finale" : `Grille d'évaluation — semaine ${p.semaine}`}
          numero={p.poei?.numero || ''} date={dateAff} org={p.org}
        />

        <View style={shared.section}>
          <PdfSectionTitle>Bénéficiaire</PdfSectionTitle>
          <View style={shared.row}><Text style={shared.label}>Nom et prénom :</Text><Text style={{ ...shared.value, fontFamily: 'Satoshi', fontWeight: 700 }}>{nomAppr}</Text></View>
          {clientNom ? <View style={shared.row}><Text style={shared.label}>Entreprise / site :</Text><Text style={shared.value}>{clientNom}</Text></View> : null}
          {formationNom ? <View style={shared.row}><Text style={shared.label}>Fonction visée :</Text><Text style={shared.value}>{formationNom}</Text></View> : null}
          {p.formateurNom ? <View style={shared.row}><Text style={shared.label}>Formateur évaluateur :</Text><Text style={shared.value}>{p.formateurNom}</Text></View> : null}
          {p.dureeRealisee ? <View style={shared.row}><Text style={shared.label}>Durée réalisée :</Text><Text style={shared.value}>{p.dureeRealisee}</Text></View> : null}
          {p.absences ? <View style={shared.row}><Text style={shared.label}>Absences / retards :</Text><Text style={shared.value}>{p.absences}</Text></View> : null}
          <View style={shared.row}><Text style={shared.label}>Progression :</Text><Text style={shared.value}>{acquis} acquis sur {evalues.length} compétence(s) évaluée(s)</Text></View>
        </View>

        {p.sections.map((sec) => (
          <View key={sec.key} style={shared.section} wrap={false}>
            <PdfSectionTitle>{sec.titre}</PdfSectionTitle>
            {sec.items.map((it, i) => {
              const v = p.items?.[it.id]
              const n = v?.n ? NIV[v.n] : null
              return (
                <View key={it.id} style={{ flexDirection: 'row', gap: 6, paddingVertical: 2.5, borderBottomWidth: 0.4, borderBottomColor: '#efedea' }}>
                  <Text style={{ width: 14, fontSize: 7.5, color: SURFACE_500 }}>{i + 1}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8, color: SURFACE_900, lineHeight: 1.4 }}>{it.label}</Text>
                    {v?.o ? <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 1 }}>{v.o}</Text> : null}
                  </View>
                  <Text style={{ width: 58, fontSize: 7.5, fontFamily: 'Satoshi', fontWeight: 700, color: n ? n.color : '#a8a29e', textAlign: 'right' }}>
                    {n ? n.label : '—'}
                  </Text>
                </View>
              )
            })}
          </View>
        ))}

        {isFinale && (
          <>
            {p.appreciationsMeta.some((a) => p.appreciations?.[a.key]) && (
              <View style={shared.section} wrap={false}>
                <PdfSectionTitle>Appréciation globale</PdfSectionTitle>
                {p.appreciationsMeta.filter((a) => p.appreciations?.[a.key]).map((a) => (
                  <View key={a.key} style={shared.row}>
                    <Text style={shared.label}>{a.label} :</Text>
                    <Text style={{ ...shared.value, fontFamily: 'Satoshi', fontWeight: 700 }}>{p.appreciations[a.key]}</Text>
                  </View>
                ))}
              </View>
            )}

            {(p.pointsForts || p.aRenforcer || p.recommandations) && (
              <View style={shared.section} wrap={false}>
                <PdfSectionTitle>Synthèse</PdfSectionTitle>
                {([['Points forts', p.pointsForts], ['À renforcer', p.aRenforcer], ['Recommandations', p.recommandations]] as const)
                  .filter(([, v]) => v).map(([l, v]) => (
                    <View key={l} style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN }}>{l}</Text>
                      <Text style={{ fontSize: 8.5, color: SURFACE_700, lineHeight: 1.5, marginTop: 2 }}>{v}</Text>
                    </View>
                  ))}
              </View>
            )}

            {p.avisFinal && (
              <View style={shared.section} wrap={false}>
                <PdfSectionTitle>Avis final du formateur</PdfSectionTitle>
                <Text style={{ fontSize: 10, fontFamily: 'Satoshi', fontWeight: 700, color: p.avisFinal.includes('DÉFAVORABLE') ? '#b4241f' : p.avisFinal.includes('RÉSERVES') ? '#b45309' : '#177245' }}>
                  {p.avisFinal}
                </Text>
                {p.motivationAvis ? <Text style={{ fontSize: 8.5, color: SURFACE_700, lineHeight: 1.5, marginTop: 4 }}>{p.motivationAvis}</Text> : null}
              </View>
            )}

            {p.conclusion && (
              <View style={shared.section} wrap={false}>
                <PdfSectionTitle>Conclusion</PdfSectionTitle>
                <Text style={{ fontSize: 8.5, color: SURFACE_900, lineHeight: 1.6 }}>{p.conclusion}</Text>
              </View>
            )}
          </>
        )}

        <View style={{ marginTop: 18, flexDirection: 'row', gap: 24 }} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN, marginBottom: 6 }}>Le formateur{p.formateurNom ? ` — ${p.formateurNom}` : ''}</Text>
            <View style={{ height: 46, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1' }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN, marginBottom: 6 }}>Le bénéficiaire — {nomAppr}</Text>
            <View style={{ height: 46, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1' }} />
          </View>
        </View>

        <PdfDocFooter numero={p.poei?.numero || ''} org={p.org} />
      </Page>
    </Document>
  )
}
