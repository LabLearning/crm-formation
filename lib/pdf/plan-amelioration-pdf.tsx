import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_500, SURFACE_700, SURFACE_900, SURFACE_200 } from './components'

/**
 * Plan d'amélioration continue (indicateur 32) : le tableau de suivi des
 * mesures issues des réclamations, aléas, difficultés, abandons et de la
 * veille — chaque action avec sa source, ses dates et son résultat constaté.
 */
export interface ActionAmelioration {
  titre: string
  description: string | null
  source: string | null
  status: string
  date_planifiee: string | null
  date_echeance: string | null
  date_realisation: string | null
  resultat: string | null
}

const SOURCES: Record<string, string> = {
  reclamation: 'Réclamation',
  abandon: 'Abandon',
  difficulte: 'Aléa / difficulté',
  insatisfaction: 'Insatisfaction',
  veille: 'Veille',
  audit: 'Audit interne',
  interne: 'Interne',
}
const STATUTS: Record<string, string> = {
  en_cours: 'En cours', realisee: 'Réalisée', verifiee: 'Réalisée et vérifiée',
}
const fdate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')

export function PlanAmeliorationPDF({ org, actions, dateEdition }: { org: any; actions: ActionAmelioration[]; dateEdition: string }) {
  const realisees = actions.filter((a) => a.status === 'realisee' || a.status === 'verifiee')
  const enCours = actions.filter((a) => a.status === 'en_cours')
  const Bloc = ({ titre, lignes }: { titre: string; lignes: ActionAmelioration[] }) => (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontSize: 10.5, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN, marginBottom: 4 }}>
        {titre} ({lignes.length})
      </Text>
      {lignes.map((a, i) => (
        <View key={i} wrap={false} style={{ borderBottomWidth: 0.5, borderBottomColor: SURFACE_200, paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 8.5, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, flex: 1, paddingRight: 8 }}>{a.titre}</Text>
            <Text style={{ fontSize: 7.5, color: SURFACE_500 }}>{SOURCES[a.source || ''] || a.source || '—'}</Text>
          </View>
          {a.description ? <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.45, marginTop: 1.5 }}>{a.description}</Text> : null}
          <Text style={{ fontSize: 7.5, color: SURFACE_500, marginTop: 2 }}>
            {a.status === 'en_cours'
              ? `Engagée le ${fdate(a.date_planifiee)} — échéance ${fdate(a.date_echeance)}`
              : `Réalisée le ${fdate(a.date_realisation || a.date_planifiee)}${a.status === 'verifiee' ? ' · efficacité vérifiée' : ''}`}
          </Text>
          {a.resultat ? (
            <Text style={{ fontSize: 8, color: SURFACE_900, lineHeight: 1.45, marginTop: 1.5 }}>
              <Text style={{ fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN }}>Résultat : </Text>
              {a.resultat}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Plan d'amélioration continue" numero={`${actions.length} mesures suivies`} date={dateEdition} org={org} />
        <Text style={{ fontSize: 8.5, color: SURFACE_500, marginTop: 6, lineHeight: 1.5 }}>
          Tableau de suivi des mesures d&apos;amélioration issues des réclamations, aléas et difficultés terrain,
          causes d&apos;abandon, motifs d&apos;insatisfaction et de la veille (indicateur 32). Chaque mesure porte sa
          source, ses dates et le résultat constaté ; le registre vivant est tenu dans le CRM (Qualité → Amélioration).
        </Text>
        <Bloc titre="Mesures réalisées" lignes={realisees} />
        <Bloc titre="Mesures en cours" lignes={enCours} />
        <PdfDocFooter numero="Plan d'amélioration continue" org={org} />
      </Page>
    </Document>
  )
}
