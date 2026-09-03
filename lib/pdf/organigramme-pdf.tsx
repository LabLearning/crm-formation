import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_200, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

export interface Pole {
  titre: string
  champ: string
  personnes: { nom: string; fonction?: string | null; email?: string | null }[]
}

/**
 * Organigramme fonctionnel (indicateur 18) : qui intervient sur quel champ —
 * pédagogique, administratif, commercial — et les référents nommés.
 *
 * Généré depuis les comptes et rôles réels du CRM : un organigramme dessiné à
 * part vieillirait à la première arrivée ou au premier départ ; celui-ci est
 * toujours l'état du jour.
 */
export function OrganigrammePDF({ org, poles, nbFormateurs }: {
  org: any
  poles: Pole[]
  nbFormateurs: number
}) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Organigramme fonctionnel" numero="" org={org} />

        <View style={shared.infoBox}>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.6 }}>
            Coordination des intervenants internes et externes (indicateur 18 du Référentiel national
            qualité). Document généré depuis le système de gestion — état au {today}.
          </Text>
        </View>

        {poles.map((p) => (
          <View key={p.titre} wrap={false} style={{ marginBottom: 10, borderWidth: 0.5, borderColor: SURFACE_200, borderRadius: 6 }}>
            <View style={{ backgroundColor: '#f4faf7', paddingVertical: 5, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: SURFACE_200 }}>
              <Text style={{ fontSize: 9.5, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN }}>{p.titre}</Text>
              <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 1 }}>{p.champ}</Text>
            </View>
            {p.personnes.map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'baseline', paddingVertical: 3.5, paddingHorizontal: 10, borderBottomWidth: i < p.personnes.length - 1 ? 0.4 : 0, borderBottomColor: '#f0efec' }}>
                <Text style={{ fontSize: 9, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, width: 170 }}>{x.nom}</Text>
                <Text style={{ fontSize: 8.5, color: SURFACE_700, flex: 1 }}>{x.fonction || ''}</Text>
                {x.email ? <Text style={{ fontSize: 7.5, color: SURFACE_500 }}>{x.email}</Text> : null}
              </View>
            ))}
          </View>
        ))}

        <View wrap={false} style={{ marginBottom: 10, borderWidth: 0.5, borderColor: SURFACE_200, borderRadius: 6 }}>
          <View style={{ backgroundColor: '#f4faf7', paddingVertical: 5, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: SURFACE_200 }}>
            <Text style={{ fontSize: 9.5, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN }}>Équipe pédagogique externe</Text>
            <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 1 }}>Animation des formations — sous-traitants liés par contrat de prestation (indicateur 27)</Text>
          </View>
          <View style={{ paddingVertical: 5, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 8.5, color: SURFACE_900 }}>
              {nbFormateurs} formateurs actifs, praticiens des métiers de bouche, coordonnés par la
              direction pédagogique : fiche mission par session, contrat de prestation, évaluation du
              profil et des compétences, portail formateur (émargement, évaluations, dossiers).
            </Text>
          </View>
        </View>

        <PdfDocFooter numero="Organigramme fonctionnel" org={org} />
      </Page>
    </Document>
  )
}
