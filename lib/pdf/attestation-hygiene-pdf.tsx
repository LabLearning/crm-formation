import * as React from 'react'
import { Document, Page, View, Text, Image } from '@react-pdf/renderer'
import { shared, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

export interface AttestationHygieneProps {
  apprenant: { civilite?: string | null; prenom?: string | null; nom?: string | null; date_naissance?: string | null }
  session: { date_debut: string; date_fin?: string | null }
  formation: { duree_heures?: number | null }
  org: any
  /** Nombre d'heures réellement suivies, s'il diffère de la durée prévue. */
  heures?: number | null
}

const jour = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

/** « M. » ou « Mme » : la civilité est libre en base, on la ramène aux deux formes. */
function civilite(v?: string | null): string {
  const n = String(v || '').toLowerCase()
  if (n.startsWith('mme') || n.startsWith('mad') || n === 'f') return 'Mme'
  if (n.startsWith('m')) return 'M.'
  return ''
}

/**
 * Attestation de formation spécifique en matière d'hygiène alimentaire.
 *
 * Ce n'est pas l'attestation de fin de formation : c'est le document
 * réglementaire de l'arrêté du 12 février 2024, celui que le restaurateur
 * présente lors d'un contrôle de la DDPP. Sa rédaction est contrainte —
 * le visa de l'arrêté, l'identité du signataire et son adresse, la date de
 * naissance du stagiaire, la durée et les dates de la formation — et un
 * document qui s'en écarte ne vaut rien devant un contrôleur.
 *
 * Un exemplaire par stagiaire, sur une page.
 */
export function AttestationHygienePDF({
  apprenants, session, formation, org, heuresParApprenant,
}: {
  apprenants: AttestationHygieneProps['apprenant'][]
  session: AttestationHygieneProps['session']
  formation: AttestationHygieneProps['formation']
  org: any
  /** Heures suivies par apprenant, indexées par leur identifiant. */
  heuresParApprenant?: Record<string, number>
}) {
  const signataire = [org?.representant_legal_prenom, org?.representant_legal_nom]
    .filter(Boolean).join(' ') || 'le représentant légal'
  const fonction = String(org?.representant_legal_fonction || 'représentant légal').toLowerCase()
  const adresseOrg = [org?.address, [org?.postal_code, org?.city].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ')
  const villeSignature = org?.city || 'Montpellier'
  const debut = jour(session.date_debut)
  const fin = jour(session.date_fin || session.date_debut)
  const dureePrevue = Number(formation?.duree_heures || 0)

  return (
    <Document>
      {apprenants.map((a: any, i) => {
        const h = heuresParApprenant?.[a.id] ?? dureePrevue
        const nomComplet = `${a.nom || ''} ${a.prenom || ''}`.trim().toUpperCase() === ''
          ? 'le stagiaire'
          : `${(a.nom || '').toUpperCase()} ${a.prenom || ''}`.trim()
        return (
          <Page key={i} size="A4" style={{ ...shared.page, paddingTop: 46 }}>
            {org?.logo_url && (
              <Image src={org.logo_url} style={{ height: 46, width: 130, objectFit: 'contain', marginBottom: 46 }} />
            )}

            <Text style={{ fontSize: 16, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, lineHeight: 1.3 }}>
              ATTESTATION DE FORMATION SPÉCIFIQUE{'\n'}EN MATIÈRE D&apos;HYGIÈNE ALIMENTAIRE
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, marginTop: 8, lineHeight: 1.4 }}>
              ADAPTÉE À L&apos;ACTIVITÉ DES ÉTABLISSEMENTS DE RESTAURATION COMMERCIALE
            </Text>

            {/* Le visa de l'arrêté fait la valeur du document devant un contrôleur. */}
            <Text style={{ fontSize: 9.5, color: SURFACE_700, marginTop: 16, lineHeight: 1.7, textAlign: 'justify' }}>
              Vu l&apos;arrêté du 12 février 2024 relatif au cahier des charges de la formation spécifique
              en matière d&apos;hygiène alimentaire adaptée à l&apos;activité des établissements de
              restauration commerciale.
            </Text>

            <Text style={{ fontSize: 9.5, color: SURFACE_700, marginTop: 12, lineHeight: 1.7, textAlign: 'justify' }}>
              Je soussigné {signataire}, {fonction} de l&apos;organisme de formation {org?.name || 'Lab Learning'}
              {adresseOrg ? ` domicilié au ${adresseOrg}` : ''}.
            </Text>

            <Text style={{ fontSize: 9.5, color: SURFACE_700, marginTop: 12 }}>Atteste que :</Text>

            <Text style={{ fontSize: 10, color: SURFACE_900, marginTop: 12 }}>
              {[civilite(a.civilite), nomComplet].filter(Boolean).join(' ')}
              {a.date_naissance ? ` né(e) le ${jour(a.date_naissance)}` : ''}.
            </Text>

            <Text style={{ fontSize: 9.5, color: SURFACE_700, marginTop: 12, lineHeight: 1.7, textAlign: 'justify' }}>
              A suivi la formation spécifique en matière d&apos;hygiène alimentaire adaptée à
              l&apos;activité des établissements de restauration commerciale d&apos;une durée de{' '}
              {h.toFixed(2).replace('.', ',')} heures.
            </Text>

            <Text style={{ fontSize: 9.5, color: SURFACE_700, marginTop: 14 }}>
              Qui s&apos;est déroulé du {debut} au {fin}.
            </Text>

            <Text style={{ fontSize: 9.5, color: SURFACE_700, marginTop: 14 }}>
              Fait pour servir et valoir ce que de droit,
            </Text>
            <Text style={{ fontSize: 9.5, color: SURFACE_700, marginTop: 10 }}>
              Fait à {villeSignature}, le {fin}.
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 26 }}>
              {/* Mention du préfet de région : la déclaration d'activité est enregistrée auprès de lui. */}
              <View style={{ width: 180 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, lineHeight: 1.3 }}>
                  PRÉFET{'\n'}DE LA RÉGION{'\n'}{String(org?.region_declaration || 'OCCITANIE').toUpperCase()}
                </Text>
                <Text style={{ fontSize: 7, color: SURFACE_500, marginTop: 5, lineHeight: 1.5 }}>
                  Liberté{'\n'}Égalité{'\n'}Fraternité
                </Text>
              </View>

              <View style={{ width: 210, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 9, color: SURFACE_700, marginBottom: 6 }}>
                  Signature et cachet de l&apos;organisme :
                </Text>
                {org?.tampon_signature_url && (
                  <Image src={org.tampon_signature_url} style={{ width: 200, height: 92, objectFit: 'contain' }} />
                )}
              </View>
            </View>

            {/* Pied de page réglementaire : le NDA et le SIRET y sont attendus. */}
            <View style={{ position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' }} fixed>
              <Text style={{ fontSize: 7.5, color: SURFACE_500 }}>
                {org?.email_contact || org?.email || ''}   ·   {String(org?.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </Text>
              <Text style={{ fontSize: 7, color: SURFACE_500, textAlign: 'right', lineHeight: 1.5 }}>
                {org?.legal_name || org?.name || 'Lab Learning'}{'\n'}
                {adresseOrg}{'\n'}
                {org?.siret ? `SIRET ${org.siret}` : ''}{org?.numero_da ? ` — NDA ${org.numero_da}` : ''}
              </Text>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}
