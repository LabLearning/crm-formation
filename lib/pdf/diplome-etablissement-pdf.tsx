import * as React from 'react'
import { Document, Page, View, Text, Image, Svg, Polygon } from '@react-pdf/renderer'
import { BRAND_GREEN, BRAND_GREEN_DARK, SURFACE_400, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

/**
 * Diplôme d'établissement — hygiène alimentaire. Document d'affichage
 * (paysage) que le restaurant peut encadrer : composition moderne et
 * asymétrique — bande pine + filet menthe à gauche, nom de l'établissement
 * en héros, chevron du logo en filigrane, millésime en pied.
 */
interface DiplomeProps {
  org: any
  etablissement: string
  ville?: string | null
  formationIntitule: string
  dateDebut?: string | null
  dateFin?: string | null
  stagiaires?: { prenom?: string | null; nom?: string | null }[]
  formateurNom?: string | null
}

const MINT = '#22A972'

function frDate(d?: string | null): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return String(d) }
}

export function DiplomeEtablissementPDF({ org, etablissement, ville, formationIntitule, dateDebut, dateFin, formateurNom }: DiplomeProps) {
  const annee = dateFin ? new Date(dateFin).getFullYear() : new Date().getFullYear()
  const periode = dateDebut && dateFin && dateDebut !== dateFin
    ? `du ${frDate(dateDebut)} au ${frDate(dateFin)}`
    : `le ${frDate(dateFin || dateDebut)}`

  return (
    <Document title={`Diplôme — ${etablissement}`} author={org?.name || 'Lab Learning'}>
      <Page size="A4" orientation="landscape" style={{ fontFamily: 'Satoshi', backgroundColor: '#FFFFFF' }}>

        {/* Bande verticale signature : pine + filet menthe */}
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 14, backgroundColor: BRAND_GREEN }} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 14, width: 3, backgroundColor: '#5CD9A0' }} />

        {/* Chevron du logo en filigrane, bas droite */}
        <Svg width={300} height={300} viewBox="0 0 100 100" style={{ position: 'absolute', right: -60, bottom: -70 }}>
          <Polygon points="20,10 55,50 20,90 34,90 69,50 34,10" fill="#EEF6F2" />
        </Svg>

        <View style={{ flex: 1, paddingLeft: 58, paddingRight: 48, paddingTop: 40, paddingBottom: 36 }}>

          {/* En-tête : logo + millésime */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {org?.logo_url ? (
              <Image src={org.logo_url} style={{ height: 30, width: 110, objectFit: 'contain' }} />
            ) : (
              <Text style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 15, color: BRAND_GREEN }}>{org?.name || 'Lab Learning'}</Text>
            )}
            <Text style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 30, color: '#E1E6EB' }}>{annee}</Text>
          </View>

          {/* Cœur du diplôme */}
          <View style={{ marginTop: 46, maxWidth: 560 }}>
            <Text style={{ fontSize: 9, letterSpacing: 4, color: MINT, textTransform: 'uppercase', fontWeight: 700 }}>
              Hygiène &amp; sécurité alimentaire
            </Text>
            <Text style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 34, color: SURFACE_900, marginTop: 12, lineHeight: 1.08 }}>
              {etablissement}
            </Text>
            {ville ? (
              <Text style={{ fontSize: 11, color: SURFACE_500, marginTop: 4 }}>{ville}</Text>
            ) : null}

            <View style={{ width: 42, height: 3, backgroundColor: '#5CD9A0', marginTop: 16, marginBottom: 16 }} />

            <Text style={{ fontSize: 13.5, color: SURFACE_700, lineHeight: 1.55 }}>
              a formé son personnel à l&apos;hygiène et à la sécurité alimentaire
            </Text>
            <Text style={{ fontSize: 9, color: SURFACE_500, lineHeight: 1.6, marginTop: 10, maxWidth: 500 }}>
              {`Formation « ${formationIntitule} » dispensée ${periode} par ${org?.legal_name || org?.name || 'Lab Learning'}, organisme certifié Qualiopi${org?.numero_da ? ` (NDA ${org.numero_da})` : ''}, conformément au règlement (CE) n° 852/2004 relatif à l'hygiène des denrées alimentaires.`}
            </Text>
          </View>

          {/* Pied : formateur + signature */}
          <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              {formateurNom ? (
                <>
                  <Text style={{ fontSize: 7.5, letterSpacing: 2, color: SURFACE_400, textTransform: 'uppercase' }}>Formateur</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: 700, color: SURFACE_900, marginTop: 3 }}>{formateurNom}</Text>
                </>
              ) : null}
              <Text style={{ fontSize: 7.5, color: SURFACE_400, marginTop: 8 }}>
                {`${org?.name || 'Lab Learning'} — ${org?.city || 'Montpellier'} · www.lab-learning.fr`}
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              {org?.tampon_signature_url ? (
                <Image src={org.tampon_signature_url} style={{ width: 118, height: 55, objectFit: 'contain' }} />
              ) : <View style={{ height: 55 }} />}
              <View style={{ width: 148, height: 0.5, backgroundColor: SURFACE_400, marginTop: 2 }} />
              <Text style={{ fontSize: 7.5, color: SURFACE_500, marginTop: 3 }}>
                {`Fait à ${org?.city || org?.ville || 'Montpellier'}, le ${frDate(new Date().toISOString())}`}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
