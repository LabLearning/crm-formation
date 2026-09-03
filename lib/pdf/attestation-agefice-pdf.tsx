import * as React from 'react'
import { Document, Page, View, Text, Image } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, SURFACE_200, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

/**
 * Attestation d'assiduité de formation et de règlement — modèle officiel
 * AGEFICE 2025/2026 reproduit champ à champ : identité de l'organisme (NDA,
 * DREETS), stagiaire, tableau formation, durées prévues/réalisées par
 * modalité, attestation de règlement (montant en lettres, mode, date),
 * double signature organisme + stagiaire.
 */
interface AttestationAgeficeProps {
  org: any
  representant?: string | null
  qualiteRepresentant?: string | null
  stagiaire: { civilite?: string | null; prenom?: string | null; nom?: string | null }
  entreprise?: string | null
  formation: { intitule?: string | null }
  dateDebut?: string | null
  dateFin?: string | null
  formateurNom?: string | null
  nbParticipants?: number | null
  modalite: string
  heuresPrevues?: number | null
  heuresRealisees?: number | null
  montantHt?: number | null
  modeReglement?: string | null
  referenceReglement?: string | null
  dateReglement?: string | null
}

function frDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return String(d) }
}

/** Montant en toutes lettres (euros, jusqu'à 999 999). */
export function montantEnLettres(n: number): string {
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
  const moins100 = (x: number): string => {
    if (x < 17) return unites[x]
    if (x < 20) return `dix-${unites[x - 10]}`
    const d = Math.floor(x / 10), u = x % 10
    if (d === 7 || d === 9) return `${dizaines[d]}${u === 1 && d === 7 ? ' et ' : '-'}${moins100(10 + u)}`
    if (u === 0) return dizaines[d] + (d === 8 ? 's' : '')
    if (u === 1 && d < 8) return `${dizaines[d]} et un`
    return `${dizaines[d]}-${unites[u]}`
  }
  const moins1000 = (x: number): string => {
    if (x < 100) return moins100(x)
    const c = Math.floor(x / 100), r = x % 100
    const cent = c === 1 ? 'cent' : `${unites[c]} cent${r === 0 ? 's' : ''}`
    return r === 0 ? cent : `${cent} ${moins100(r)}`
  }
  const entier = Math.floor(Math.abs(n))
  const centimes = Math.round((Math.abs(n) - entier) * 100)
  let mots: string
  if (entier === 0) mots = 'zéro'
  else if (entier < 1000) mots = moins1000(entier)
  else {
    const m = Math.floor(entier / 1000), r = entier % 1000
    const mille = m === 1 ? 'mille' : `${moins1000(m)} mille`
    mots = r === 0 ? mille : `${mille} ${moins1000(r)}`
  }
  return `${mots} euro${entier > 1 ? 's' : ''}${centimes ? ` et ${moins100(centimes)} centime${centimes > 1 ? 's' : ''}` : ''}`
}

const MODALITE_LIGNES = [
  { cle: 'presentiel_individuel', label: 'Durée en présentiel individuel (1)' },
  { cle: 'presentiel_collectif', label: 'Durée en présentiel collectif (2)' },
  { cle: 'distanciel_synchrone', label: 'Durée en distanciel synchrone (3)' },
  { cle: 'distanciel_asynchrone', label: 'Durée en distanciel asynchrone (4)' },
]

export function AttestationAgeficePDF(props: AttestationAgeficeProps) {
  const { org, stagiaire, formation } = props
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const numero = `AAR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`

  // Ventilation : la modalité du dossier porte les heures, les autres restent vides
  const ligneActive = props.modalite === 'distanciel_synchrone' ? 'distanciel_synchrone'
    : props.modalite === 'distanciel_asynchrone' ? 'distanciel_asynchrone'
    : (props.nbParticipants || 1) > 1 ? 'presentiel_collectif' : 'presentiel_individuel'

  // Représentant légal prérempli depuis la fiche organisation
  const representant = props.representant
    || [org.representant_legal_civilite === 'Mr' ? 'M.' : org.representant_legal_civilite, org.representant_legal_prenom, org.representant_legal_nom].filter(Boolean).join(' ')
    || ''
  const qualite = props.qualiteRepresentant || org.representant_legal_fonction || 'Dirigeant'
  const montant = Number(props.montantHt || 0)
  const modeTexte = props.modeReglement === 'cheque'
    ? `chèque${props.referenceReglement ? ` n° ${props.referenceReglement}` : ''}`
    : props.modeReglement === 'virement'
      ? `virement${props.referenceReglement ? ` n° ${props.referenceReglement}` : ''}`
      : '—'

  const cellLabel = { fontSize: 8.5, fontFamily: 'Satoshi', fontWeight: 700 as const, color: SURFACE_700, padding: 6, width: '38%' }
  const cellVal = { fontSize: 8.5, color: SURFACE_900, padding: 6, flex: 1 }

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Attestation d'assiduité de formation et de règlement" numero={numero} org={org} />
        <Text style={{ fontSize: 7, color: SURFACE_500, marginBottom: 8 }}>Conforme au modèle AGEFICE 2025/2026</Text>

        <View style={shared.section}>
          <Text style={{ fontSize: 9.5, color: SURFACE_700, lineHeight: 1.7 }}>
            {`Je soussigné(e) ${representant || '____________________'}, agissant en qualité de ${qualite} de ${org.legal_name || org.name}, enregistré sous le numéro de déclaration d'activité ${org.numero_da || '____________'} auprès de la DREETS de ${org.region_dreets || 'Occitanie'}, atteste que :`}
          </Text>
        </View>

        <View style={shared.infoBox}>
          <Text style={{ fontSize: 10, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, marginBottom: 3 }}>
            {stagiaire.civilite ? `${stagiaire.civilite} ` : ''}{stagiaire.prenom} {stagiaire.nom}
          </Text>
          {props.entreprise ? <Text style={shared.infoBoxText}>{`de : ${props.entreprise}`}</Text> : null}
          <Text style={shared.infoBoxText}>a bien suivi l&apos;action de formation telle que détaillée ci-dessous.</Text>
        </View>

        {/* Formation concernée */}
        <View style={{ ...shared.section, borderWidth: 0.75, borderColor: SURFACE_200, borderRadius: 8, overflow: 'hidden' }}>
          {[
            ['Intitulé de formation', formation.intitule || '—'],
            ['Date de démarrage', frDate(props.dateDebut)],
            ['Date de fin', frDate(props.dateFin)],
            ['Nom et qualité du formateur', props.formateurNom ? `${props.formateurNom} — Formateur` : '—'],
            ['Nombre de participants', String(props.nbParticipants ?? 1)],
          ].map(([l, v], i) => (
            <View key={l} style={{ flexDirection: 'row', backgroundColor: i % 2 ? '#F6F8FA' : '#FFFFFF', borderTopWidth: i ? 0.5 : 0, borderTopColor: SURFACE_200 }}>
              <Text style={cellLabel}>{l}</Text>
              <Text style={cellVal}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Durées par modalité — prévue / réalisée */}
        <View style={{ ...shared.section, borderWidth: 0.75, borderColor: SURFACE_200, borderRadius: 8, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#0F1720' }}>
            <Text style={{ ...cellLabel, color: '#FFFFFF' }}>Durée en heure(s)</Text>
            <Text style={{ ...cellVal, color: '#FFFFFF', fontFamily: 'Satoshi', fontWeight: 700, textAlign: 'center' }}>Prévue</Text>
            <Text style={{ ...cellVal, color: '#FFFFFF', fontFamily: 'Satoshi', fontWeight: 700, textAlign: 'center' }}>Réalisée</Text>
          </View>
          {MODALITE_LIGNES.map((m, i) => (
            <View key={m.cle} style={{ flexDirection: 'row', backgroundColor: i % 2 ? '#F6F8FA' : '#FFFFFF', borderTopWidth: 0.5, borderTopColor: SURFACE_200 }}>
              <Text style={cellLabel}>{m.label}</Text>
              <Text style={{ ...cellVal, textAlign: 'center' }}>{m.cle === ligneActive && props.heuresPrevues ? `${props.heuresPrevues} h` : ''}</Text>
              <Text style={{ ...cellVal, textAlign: 'center' }}>{m.cle === ligneActive && (props.heuresRealisees ?? props.heuresPrevues) ? `${props.heuresRealisees ?? props.heuresPrevues} h` : ''}</Text>
            </View>
          ))}
        </View>

        <View style={shared.section}>
          <Text style={{ fontSize: 8.5, color: SURFACE_700, lineHeight: 1.65 }}>
            L&apos;organisme de formation assure avoir réalisé la formation conformément aux modalités détaillées dans la
            demande préalable de financement et/ou dans la convention de formation signée avec le stagiaire, dans le
            respect des critères de financement de l&apos;AGEFICE. Il assure avoir fourni la double assistance technique et
            pédagogique prévue par les textes et s&apos;engage à conserver l&apos;ensemble des pièces justificatives permettant
            de démontrer la réalité et le suivi de l&apos;action, de l&apos;accompagnement et de l&apos;assistance du stagiaire.
          </Text>
        </View>

        {/* Attestation de règlement */}
        <View style={{ ...shared.section, borderWidth: 0.75, borderColor: SURFACE_200, borderRadius: 8, padding: 10, backgroundColor: '#F6F8FA' }}>
          <Text style={{ fontSize: 9, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, marginBottom: 2 }}>Attestation de règlement</Text>
          <Text style={{ fontSize: 7, color: SURFACE_500, marginBottom: 4 }}>Si la facture acquittée n&apos;est pas transmise :</Text>
          <Text style={{ fontSize: 8.5, color: SURFACE_700, lineHeight: 1.65 }}>
            {`J'atteste également que le bénéficiaire de cette action a bien réglé la totalité du coût pédagogique H.T. pour un montant de ${montant ? montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 }).replace(/[\u202f\u00a0]/g, ' ') : '____________'} € (${montant ? montantEnLettres(montant) : '____________________'}), payés par ${modeTexte}${props.dateReglement ? ` en date du ${frDate(props.dateReglement)}` : ''}.`}
          </Text>
        </View>

        <View style={shared.section}>
          <Text style={{ fontSize: 7.5, color: SURFACE_500, lineHeight: 1.6 }}>
            L&apos;AGEFICE se réserve le droit de suspendre les paiements en cas de non-conformité, de procéder à tout
            signalement auprès des autorités compétentes et d&apos;initier toutes procédures, y compris juridictionnelles,
            en cas de fausses déclarations ou justificatifs mensongers.
          </Text>
        </View>

        <Text style={{ fontSize: 8, color: SURFACE_500, marginTop: 6 }}>{`Fait à ${org.city || org.ville || '___________'}, le ${today}`}</Text>

        {/* Double signature */}
        <View style={{ flexDirection: 'row', gap: 30, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN, marginBottom: 4 }}>L&apos;organisme de formation</Text>
            <View style={{ height: 70 }}>
              <View style={{ position: 'absolute', bottom: 14, left: 0, right: 20, height: 0.5, backgroundColor: '#CBD3DB' }} />
              {org.tampon_signature_url ? (
                <Image src={org.tampon_signature_url} style={{ position: 'absolute', top: 0, left: 5, width: 150, height: 66, objectFit: 'contain' }} />
              ) : null}
            </View>
            <Text style={{ fontSize: 7, color: SURFACE_500 }}>Signature et cachet</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, marginBottom: 4 }}>Le stagiaire</Text>
            <View style={{ height: 70 }}>
              <View style={{ position: 'absolute', bottom: 14, left: 0, right: 20, height: 0.5, backgroundColor: '#CBD3DB' }} />
            </View>
            <Text style={{ fontSize: 7, color: SURFACE_500 }}>Signature et cachet</Text>
          </View>
        </View>

        {/* Notes du modèle officiel */}
        <View style={{ marginTop: 14, borderTopWidth: 0.5, borderTopColor: SURFACE_200, paddingTop: 5 }}>
          {[
            '(1) Formateur et stagiaires nécessairement réunis physiquement en un même lieu.',
            "(2) Plus d'un stagiaire, même s'ils appartiennent à la même entreprise.",
            '(3) Formateur et stagiaires réunis en temps réel sur des plages horaires préalablement définies — classe virtuelle, face à face en visioconférence.',
            "(4) Bénéficiant d'un suivi logiciel des temps de connexion en temps réel (horaire, durée, adresse IP) et d'une assistance technique et pédagogique appropriée et avérée.",
          ].map((n) => (
            <Text key={n} style={{ fontSize: 6.2, color: SURFACE_500, lineHeight: 1.5 }}>{n}</Text>
          ))}
        </View>

        <PdfDocFooter numero={numero} org={org} />
      </Page>
    </Document>
  )
}
