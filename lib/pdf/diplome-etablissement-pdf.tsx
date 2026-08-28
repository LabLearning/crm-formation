import * as React from 'react'
import { Document, Page, View, Text, Image } from '@react-pdf/renderer'
import { BRAND_GREEN, BRAND_GREEN_DARK, SURFACE_400, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

/**
 * Diplôme d'établissement — hygiène alimentaire. Document d'affichage
 * (paysage, style diplôme) que le restaurant peut encadrer en salle :
 * atteste que le personnel a été formé par un organisme certifié Qualiopi.
 */
interface DiplomeProps {
  org: any
  etablissement: string
  ville?: string | null
  formationIntitule: string
  dateDebut?: string | null
  dateFin?: string | null
  stagiaires: { prenom?: string | null; nom?: string | null }[]
  formateurNom?: string | null
}

function frDate(d?: string | null): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return String(d) }
}

export function DiplomeEtablissementPDF({ org, etablissement, ville, formationIntitule, dateDebut, dateFin, stagiaires, formateurNom }: DiplomeProps) {
  const annee = dateFin ? new Date(dateFin).getFullYear() : new Date().getFullYear()
  const periode = dateDebut && dateFin && dateDebut !== dateFin
    ? `du ${frDate(dateDebut)} au ${frDate(dateFin)}`
    : `le ${frDate(dateFin || dateDebut)}`

  return (
    <Document title={`Diplôme — ${etablissement}`} author={org?.name || 'Lab Learning'}>
      <Page size="A4" orientation="landscape" style={{ fontFamily: 'Satoshi', backgroundColor: '#FFFFFF', padding: 26 }}>
        {/* Double cadre du diplôme */}
        <View style={{ flex: 1, borderWidth: 2, borderColor: BRAND_GREEN, borderRadius: 6, padding: 5 }}>
          <View style={{ flex: 1, borderWidth: 0.75, borderColor: BRAND_GREEN, borderRadius: 3, paddingVertical: 26, paddingHorizontal: 48, alignItems: 'center' }}>

            {/* Logo */}
            {org?.logo_url ? (
              <Image src={org.logo_url} style={{ height: 34, width: 120, objectFit: 'contain', marginBottom: 14 }} />
            ) : (
              <Text style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 16, color: BRAND_GREEN, marginBottom: 14 }}>{org?.name || 'Lab Learning'}</Text>
            )}

            <Text style={{ fontSize: 8, letterSpacing: 3.5, color: SURFACE_500, textTransform: 'uppercase' }}>Hygiène et sécurité alimentaire</Text>
            <Text style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 27, color: SURFACE_900, marginTop: 8, letterSpacing: 0.5 }}>
              CERTIFICAT D&apos;ÉTABLISSEMENT
            </Text>
            <View style={{ width: 54, height: 2.5, backgroundColor: BRAND_GREEN, marginTop: 10, marginBottom: 16 }} />

            <Text style={{ fontSize: 10.5, color: SURFACE_700, textAlign: 'center', lineHeight: 1.6 }}>
              {`${org?.legal_name || org?.name || 'Lab Learning'}, organisme de formation certifié Qualiopi${org?.numero_da ? ` (NDA ${org.numero_da})` : ''}, certifie que l'établissement`}
            </Text>

            <Text style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 21, color: BRAND_GREEN, marginTop: 10, textAlign: 'center' }}>
              {etablissement}{ville ? ` — ${ville}` : ''}
            </Text>

            <Text style={{ fontSize: 10.5, color: SURFACE_700, textAlign: 'center', lineHeight: 1.6, marginTop: 10, maxWidth: 560 }}>
              {`a formé son personnel dans le cadre de la formation « ${formationIntitule} », dispensée ${periode}, conformément au règlement (CE) n° 852/2004 relatif à l'hygiène des denrées alimentaires et à la réglementation en vigueur.`}
            </Text>

            {/* Personnel formé */}
            {stagiaires.length > 0 && (
              <View style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 7.5, letterSpacing: 2, color: SURFACE_400, textTransform: 'uppercase', marginBottom: 5 }}>
                  Personnel formé
                </Text>
                <Text style={{ fontSize: 10, color: SURFACE_900, textAlign: 'center', lineHeight: 1.6, maxWidth: 620, fontWeight: 700 }}>
                  {stagiaires.map((a) => `${a.prenom || ''} ${a.nom || ''}`.trim()).filter(Boolean).join('   ·   ')}
                </Text>
              </View>
            )}

            {/* Pied : millésime + signature */}
            <View style={{ marginTop: 'auto', width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20, color: BRAND_GREEN_DARK }}>{annee}</Text>
                <Text style={{ fontSize: 7.5, color: SURFACE_500, marginTop: 2 }}>
                  {formateurNom ? `Formation animée par ${formateurNom}` : (org?.name || 'Lab Learning')}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                {org?.tampon_signature_url ? (
                  <Image src={org.tampon_signature_url} style={{ width: 120, height: 56, objectFit: 'contain' }} />
                ) : <View style={{ height: 56 }} />}
                <View style={{ width: 150, height: 0.5, backgroundColor: SURFACE_400, marginTop: 2 }} />
                <Text style={{ fontSize: 7.5, color: SURFACE_500, marginTop: 3 }}>
                  {`Fait à ${org?.city || org?.ville || 'Montpellier'}, le ${frDate(new Date().toISOString())}`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
