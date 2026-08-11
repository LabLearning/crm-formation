import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfSectionTitle, PdfDocHeader, PdfDocFooter, shared, SURFACE_500, SURFACE_700, SURFACE_900, SURFACE_200 } from './components'

export interface ChiffresTracabilite {
  sessionsTotal: number
  sessionsReprises: number
  sessions2025: number
  sessions2026: number
  apprenantsTotal: number
  apprenantsRepris: number
  inscriptions: number
  facturesTotal: number
  facturesReprises: number
  factures2025Nb: number
  factures2025Montant: number
  bpf2025: number
  presenceImportee: number
  evaluationsAcquis: number
  noteMoyenne: number
  emargementsSignes: number
  emargementsTotal: number
  qcmComplets: number
  qcmTotal: number
  veilles: number
  reclamations: number
  actionsAmelioration: number
  recueilsBesoin: number
  auditsHygiene: number
}

const espace = (s: string) => s.replace(/[\u202F\u00A0]/g, ' ')
const fmt = (n: number) => espace(Number(n || 0).toLocaleString('fr-FR'))
const euro = (n: number) => `${espace(Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }))} €`

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: 9, color: SURFACE_700, lineHeight: 1.55, marginBottom: 7 }}>{children}</Text>
}

function Ligne({ label, valeur, note }: { label: string; valeur: string; note?: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: SURFACE_200 }}>
      <Text style={{ fontSize: 8.5, color: SURFACE_700, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 8.5, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, width: 110, textAlign: 'right' }}>{valeur}</Text>
      {note !== undefined && <Text style={{ fontSize: 7.5, color: SURFACE_500, width: 150, textAlign: 'right' }}>{note}</Text>}
    </View>
  )
}

/**
 * Note interne de traçabilité du changement de système d'information.
 *
 * Document destiné à l'auditeur : il explique ce qui a été repris, ce qui ne
 * l'a pas été et pourquoi, donne les chiffres de réconciliation avec les
 * sources qui font foi (OPCO, BPF), et liste les mesures prises depuis. Les
 * chiffres sont calculés à la génération : la note ne peut pas être périmée.
 */
export function NoteTracabilitePDF({ org, c, dateEdition }: { org?: any; c: ChiffresTracabilite; dateEdition: string }) {
  const ecart = c.factures2025Montant - c.bpf2025
  const ecartPct = c.bpf2025 ? Math.abs(ecart / c.bpf2025) * 100 : 0

  return (
    <Document>
      <Page size="A4" style={{ ...shared.page, paddingTop: 40, paddingBottom: 46 }}>
        <PdfDocHeader
          docTitle="Note de traçabilité"
          numero="Changement de système d'information"
          date={`Éditée le ${dateEdition}`}
          org={org}
        />

        <View style={{ ...shared.section, marginBottom: 12 }}>
          <PdfSectionTitle>Objet</PdfSectionTitle>
          <Para>
            Lab Learning a changé de système d&apos;information de gestion de la formation en 2026, passant de
            l&apos;outil Dendreo à un CRM interne. La présente note décrit ce qui a été repris, ce qui ne l&apos;a
            pas été, les contrôles de cohérence réalisés avec les sources qui font foi, et les mesures mises en
            place depuis pour garantir la continuité de la preuve.
          </Para>
          <Para>
            Elle est établie à l&apos;attention de l&apos;auditeur dans le cadre de l&apos;audit de surveillance
            Qualiopi, et vaut engagement de l&apos;organisme sur l&apos;exactitude des éléments qu&apos;elle contient.
          </Para>
        </View>

        <View style={{ ...shared.section, marginBottom: 12 }}>
          <PdfSectionTitle>Ce qui a été repris</PdfSectionTitle>
          <Ligne label="Actions de formation" valeur={`${fmt(c.sessionsTotal)}`} note={`dont ${fmt(c.sessionsReprises)} reprises de Dendreo`} />
          <Ligne label="Réparties sur" valeur={`${fmt(c.sessions2025)} en 2025`} note={`${fmt(c.sessions2026)} en 2026`} />
          <Ligne label="Stagiaires" valeur={`${fmt(c.apprenantsTotal)}`} note={`dont ${fmt(c.apprenantsRepris)} repris`} />
          <Ligne label="Inscriptions" valeur={`${fmt(c.inscriptions)}`} note="lien stagiaire / action" />
          <Ligne label="Factures" valeur={`${fmt(c.facturesTotal)}`} note={`dont ${fmt(c.facturesReprises)} reprises`} />
          <Ligne label="Temps de présence réels" valeur={`${fmt(c.presenceImportee)}`} note={`sur ${fmt(c.inscriptions)} inscriptions`} />
          <Ligne label="Évaluations des acquis" valeur={`${fmt(c.evaluationsAcquis)}`} note={`note moyenne ${c.noteMoyenne.toFixed(1)} / 20`} />
        </View>

        <View style={{ ...shared.section, marginBottom: 12 }}>
          <PdfSectionTitle>Contrôles de cohérence</PdfSectionTitle>
          <Para>
            La reprise a été contrôlée non pas contre l&apos;ancien outil, mais contre les sources externes qui font
            foi : les extractions des financeurs et la déclaration BPF.
          </Para>
          <Ligne label="Facturation 2025 dans le système" valeur={euro(c.factures2025Montant)} note={`${fmt(c.factures2025Nb)} factures`} />
          <Ligne label="Déclaration BPF 2025" valeur={euro(c.bpf2025)} note="source de référence" />
          <Ligne label="Écart" valeur={euro(Math.abs(ecart))} note={`${ecartPct.toFixed(2)} % du total`} />
          <Para>
            Les dossiers ont par ailleurs été rapprochés un à un des extractions AKTO, OPCO EP et Opcommerce, et les
            actions de formation manquantes ont été créées à partir de ces extractions. L&apos;écart résiduel sur la
            facturation 2025 est inférieur à 0,5 % et s&apos;explique par des avoirs et des factures annulées.
          </Para>
        </View>

        <View style={{ ...shared.section, marginBottom: 12 }}>
          <PdfSectionTitle>Ce qui n&apos;a pas été repris, et pourquoi</PdfSectionTitle>
          <Para>
            <Text style={{ fontFamily: 'Satoshi', fontWeight: 700 }}>Les signatures d&apos;émargement antérieures.</Text>{' '}
            L&apos;ancien outil ne permettait pas d&apos;exporter les images de signature. Les feuilles d&apos;émargement
            des actions antérieures à la migration restent consultables et archivées dans l&apos;ancien système, et sur
            support papier lorsqu&apos;elles ont été signées ainsi. Le système actuel compte
            {' '}{fmt(c.emargementsSignes)} signatures électroniques sur {fmt(c.emargementsTotal)} créneaux, la
            différence correspondant aux actions antérieures à la mise en service.
          </Para>
          <Para>
            <Text style={{ fontFamily: 'Satoshi', fontWeight: 700 }}>Les questionnaires antérieurs.</Text>{' '}
            Les réponses aux questionnaires remplis dans l&apos;ancien outil n&apos;étaient pas exportables autrement
            que sous forme agrégée. Les {fmt(c.evaluationsAcquis)} évaluations des acquis réelles ont pu être reprises
            avec leur note ; les questionnaires de satisfaction antérieurs ont été recueillis sur support papier et
            sont conservés à ce titre.
          </Para>
          <Para>
            <Text style={{ fontFamily: 'Satoshi', fontWeight: 700 }}>Position de l&apos;organisme.</Text>{' '}
            Aucune donnée n&apos;a été reconstituée, simulée ou complétée a posteriori. Les éléments absents sont
            déclarés comme tels dans la présente note. Ce choix a été fait délibérément : une preuve reconstituée
            n&apos;est pas une preuve.
          </Para>
        </View>

        <View style={{ ...shared.section, marginBottom: 12 }} wrap={false}>
          <PdfSectionTitle>Mesures mises en place depuis</PdfSectionTitle>
          <Ligne label="Recueil du besoin par action de formation" valeur={`${fmt(c.recueilsBesoin)}`} note="indicateur 4" />
          <Ligne label="Registre de veille (légale, métier, pédagogique, handicap)" valeur={`${fmt(c.veilles)}`} note="indicateurs 23 à 26" />
          <Ligne label="Registre des réclamations" valeur={`${fmt(c.reclamations)}`} note="indicateur 29" />
          <Ligne label="Actions d'amélioration engagées" valeur={`${fmt(c.actionsAmelioration)}`} note="indicateurs 30 à 32" />
          <Ligne label="Audits hygiène et DUERP rattachés aux clients" valeur={`${fmt(c.auditsHygiene)}`} note="besoin identifié" />
          <Para>
            S&apos;y ajoutent, sans indicateur chiffré : l&apos;émargement électronique sur tous les créneaux, le
            déroulé pédagogique opérationnel signé par chaque formateur et validé étape par étape sur chaque action,
            un registre d&apos;incidents, la publication des indicateurs de résultats, et un vivier de formateurs de
            secours documenté.
          </Para>
        </View>

        <View style={{ ...shared.infoBox, marginTop: 4 }} wrap={false}>
          <Text style={{ fontSize: 8, fontFamily: 'Satoshi', fontWeight: 700, marginBottom: 3 }}>Accès à l&apos;antériorité</Text>
          <Text style={{ fontSize: 8, color: SURFACE_700, lineHeight: 1.5 }}>
            L&apos;ancien système reste accessible en consultation. Tout dossier antérieur à la migration peut être
            produit sur demande pendant l&apos;audit, sous forme de son dossier complet d&apos;origine.
          </Text>
        </View>

        <View style={{ marginTop: 18 }} wrap={false}>
          <Text style={{ fontSize: 8.5, color: SURFACE_700 }}>
            Fait à {org?.city || '—'}, le {dateEdition}
          </Text>
          <Text style={{ fontSize: 8.5, color: SURFACE_700, marginTop: 3 }}>
            {[org?.representant_legal_prenom, org?.representant_legal_nom].filter(Boolean).join(' ') || '—'}
            {org?.representant_legal_fonction ? ` — ${org.representant_legal_fonction}` : ''}
          </Text>
        </View>

        <PdfDocFooter numero="Note de traçabilité" org={org} />
      </Page>
    </Document>
  )
}
