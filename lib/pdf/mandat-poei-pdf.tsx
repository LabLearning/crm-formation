import * as React from 'react'
import { Document, Page, View, Text, Image as PdfImage } from '@react-pdf/renderer'
import { PdfSectionTitle, PdfDocHeader, PdfDocFooter, shared, SURFACE_200, SURFACE_400, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

/**
 * Mandat POEI — convention de mandat entre l'entreprise future recruteuse
 * (mandant) et l'organisme de formation (mandataire), sur le modèle de
 * l'expérimentation France Travail : l'OF réalise les démarches de la demande
 * d'aide POEI au nom de l'entreprise, à titre gratuit.
 *
 * Le texte suit le modèle France Travail ; les faits (parties, bénéficiaires,
 * dates) viennent du CRM. Une donnée absente laisse un blanc — jamais une
 * valeur inventée. La signature du gérant vient du lien de signature
 * électronique ; le tampon de l'OF est celui de l'organisation.
 */
export function MandatPoeiPDF({ org, poei, client, gerantNom, candidats, dateEmission, signature }: {
  org: any
  poei: any
  client: any
  /** Nom du gérant / représentant de l'entreprise (contact référent de la fiche client). */
  gerantNom: string | null
  candidats: { prenom: string; nom: string }[]
  /** Date portée sur le mandat (date d'émission, pas celle du clic). */
  dateEmission: string | null
  signature?: { data?: string | null; nom?: string | null; date?: string | null } | null
}) {
  const fr = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null

  const clientNom = client?.raison_sociale || client?.nom_commercial || ''
  const clientAdresse = [client?.adresse, [client?.code_postal, client?.ville].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ')
  // SIREN = 9 premiers chiffres du SIRET ; le RCS se rattache à la ville du siège.
  const siren = client?.siret ? String(client.siret).replace(/\D/g, '').slice(0, 9) : null
  const immatriculation = siren
    ? `immatriculée sous le numéro ${siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')} R.C.S. ${client?.ville || ''}`.trim()
    : 'immatriculée au registre du commerce et des sociétés'

  const representantOF = [org?.representant_legal_prenom, org?.representant_legal_nom].filter(Boolean).join(' ') || 'Julien COLELLA'
  const fonctionOF = (org?.representant_legal_fonction || 'Président').toLowerCase()
  const adresseOF = [org?.address, [org?.postal_code, org?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  const beneficiaires = candidats.length
    ? candidats.map((c) => `${c.prenom || ''} ${c.nom || ''}`.trim()).filter(Boolean).join(', ')
    : null

  const dates = poei?.date_debut && poei?.date_fin
    ? `du ${fr(poei.date_debut)} au ${fr(poei.date_fin)}`
    : 'du ............ au ............ (dates à préciser dès la sélection du/de la candidat(e))'

  const P = ({ children, gras }: { children: React.ReactNode; gras?: boolean }) => (
    <Text style={{ fontSize: 8.4, color: SURFACE_700, lineHeight: 1.55, marginBottom: 5, fontWeight: gras ? 700 : 400 }}>
      {children}
    </Text>
  )
  const Puce = ({ children }: { children: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', marginBottom: 2.5, paddingLeft: 8 }}>
      <Text style={{ fontSize: 8.4, color: SURFACE_500, width: 10 }}>•</Text>
      <Text style={{ fontSize: 8.4, color: SURFACE_700, lineHeight: 1.5, flex: 1 }}>{children}</Text>
    </View>
  )

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Mandat — Convention de mandat POEI" numero={poei?.numero || ''} date={fr(dateEmission) || ''} org={org} />

        <View style={{ marginBottom: 8 }}>
          <PdfSectionTitle>Entre les soussignés</PdfSectionTitle>
          <P>
            {`${clientNom}, représentée par son gérant ${gerantNom || '............'}, dûment habilité à cet effet, demeurant en cette qualité : ${clientAdresse || '............'}, ${immatriculation}.`}
          </P>
          <P gras>Ci-après l&apos;employeur mandant,</P>
          <P>
            {`${org?.legal_name || org?.name || 'Lab Learning'}, représenté par son ${fonctionOF} ${representantOF}, dûment habilité à cet effet, demeurant au ${adresseOF}, SIRET : ${org?.siret || ''}, enregistré sous le numéro de déclaration d'activité ${org?.numero_da || ''} auprès du Préfet de la région d'Occitanie.`}
          </P>
          <P gras>Ci-après l&apos;organisme de formation mandataire,</P>
          <P>
            L&apos;employeur mandant donne mandat exprès et spécial à l&apos;organisme de formation mandataire, qui
            accepte d&apos;exercer ce mandat exprès et spécial. Les parties conviennent ce qui suit :
          </P>
        </View>

        <View style={{ marginBottom: 8 }}>
          <PdfSectionTitle>Préambule</PdfSectionTitle>
          <P>
            La Préparation Opérationnelle à l&apos;Emploi individuelle (POEI) permet la mise en place d&apos;une formation
            de préparation à une prise de poste lorsque l&apos;entreprise a diagnostiqué la difficulté de trouver un candidat
            correspondant exactement au profil recherché. Cette aide finance tout ou partie des frais engagés pour une
            formation réalisée au sein d&apos;un organisme de formation.
          </P>
          <P>
            Afin de faciliter la mobilisation des POEI, France Travail autorise à titre expérimental la mise en œuvre
            d&apos;un mandat entre une entreprise future recruteuse et l&apos;organisme de formation qui réalise la formation
            avant embauche. Le mandat permet à l&apos;organisme de formation de réaliser toutes les démarches (recrutement,
            demande de POEI en ligne, devis, plan de formation, validation de la POEI et bilan de la mesure) pour le compte
            de l&apos;entreprise qui l&apos;a mandaté. Le mandat est transmis lors de la saisie en ligne de la demande.
          </P>
        </View>

        <View style={{ marginBottom: 8 }}>
          <PdfSectionTitle>Article 1 — Objet du mandat</PdfSectionTitle>
          <P>
            {`Par la présente convention, l'employeur mandant délègue à l'organisme de formation mandataire le dépôt de l'offre et la démarche de demande de POEI en son nom et pour son compte auprès de France Travail, pour une POEI en modalité « formation théorique » au bénéfice de ${beneficiaires || '............ (nom et prénom du/des demandeur(s) d’emploi)'}.`}
          </P>
          <P>La liste des actes confiés au mandataire, sous la responsabilité de l&apos;employeur mandant :</P>
          <Puce>Création d&apos;un compte entreprise et dépôt de l&apos;offre</Puce>
          <Puce>Initialisation de la demande d&apos;aide et sélection ou saisie de l&apos;offre d&apos;emploi</Puce>
          <Puce>Identification du demandeur d&apos;emploi et sélection du devis</Puce>
          <Puce>Validation de la proposition des montants transmise par France Travail</Puce>
          <Puce>Validation finale de la demande (création de la convention)</Puce>
          <Puce>Saisie du bilan de la mesure</Puce>
          <P>
            L&apos;organisme de formation mandataire ne peut représenter l&apos;employeur mandant que dans les limites
            définies par la présente convention.
          </P>
        </View>

        <View style={{ marginBottom: 8 }}>
          <PdfSectionTitle>Article 2 — Obligations des parties</PdfSectionTitle>
          <P>
            Le mandataire est tenu envers l&apos;employeur mandant de la bonne exécution de la mission confiée et d&apos;une
            obligation d&apos;information et de conseil. Il s&apos;engage à exécuter personnellement son mandat dans le
            meilleur intérêt de l&apos;employeur mandant, à ne pas agir dans son intérêt propre ni dans celui d&apos;un tiers,
            et à tenir l&apos;employeur mandant informé de l&apos;ensemble des démarches, actes, événements ou difficultés
            relatifs à l&apos;exécution de sa mission.
          </P>
          <P>
            Le mandant est tenu envers le mandataire des obligations prévues par les articles 1998 et suivants du code
            civil, notamment un devoir de coopération. Il s&apos;engage à tout mettre en œuvre pour faciliter les missions
            du mandataire.
          </P>
        </View>

        <View style={{ marginBottom: 8 }}>
          <PdfSectionTitle>Article 3 — Mandat à titre gratuit</PdfSectionTitle>
          <P>
            En considération de l&apos;exécution de son mandat, l&apos;organisme de formation mandataire ne reçoit aucune
            rémunération, ledit mandat devant être accompli à titre gratuit.
          </P>
        </View>

        <View style={{ marginBottom: 8 }}>
          <PdfSectionTitle>Article 4 — Règlement des différends</PdfSectionTitle>
          <P>
            En cas de différend découlant du présent mandat, les parties conviennent de tenter, avant toute saisine
            d&apos;une juridiction, de trouver une issue amiable en déployant tout effort raisonnable. La partie concernée
            notifie à l&apos;autre la nature du différend en joignant les documents nécessaires. Si le différend n&apos;a pas
            été réglé dans un délai de trente (30) jours, les parties conviennent de le soumettre aux juridictions
            compétentes.
          </P>
        </View>

        <View style={{ marginBottom: 10 }}>
          <PdfSectionTitle>Article 5 — Durée du mandat</PdfSectionTitle>
          <P>{`La présente convention est conclue pour la durée du recrutement et de la POEI, soit ${dates}.`}</P>
          <P>
            Elle est liée au recrutement et à la demande de POEI à laquelle elle se rapporte. Dans le cas où la demande
            serait refusée par France Travail, la convention prend fin.
          </P>
        </View>

        <Text style={{ fontSize: 8.4, color: SURFACE_700, marginBottom: 14 }}>
          {`Fait à ${org?.city || 'Montpellier'}, le ${fr(dateEmission) || '............'}, en 2 originaux, dont un remis à chaque partie.`}
        </Text>

        <View style={{ flexDirection: 'row', gap: 14 }} wrap={false}>
          <View style={{ flex: 1, borderWidth: 0.7, borderColor: SURFACE_200, borderRadius: 6, padding: 10, minHeight: 120 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, color: SURFACE_900, marginBottom: 2 }}>Pour l&apos;employeur mandant,</Text>
            <Text style={{ fontSize: 8, color: SURFACE_700, marginBottom: 6 }}>
              {`${clientNom}${gerantNom ? ` — ${gerantNom}` : ''}`}
            </Text>
            <Text style={{ fontSize: 7.5, color: SURFACE_400, marginBottom: 4 }}>Signature :</Text>
            {signature?.data ? (
              <View>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <PdfImage src={signature.data} style={{ width: 130, height: 52, objectFit: 'contain', alignSelf: 'flex-start' }} />
                {signature.date ? (
                  <Text style={{ fontSize: 7, color: SURFACE_400, marginTop: 3 }}>
                    {`Signé électroniquement le ${fr(signature.date)}${signature.nom ? ` par ${signature.nom}` : ''}`}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, borderWidth: 0.7, borderColor: SURFACE_200, borderRadius: 6, padding: 10, minHeight: 120 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, color: SURFACE_900, marginBottom: 2 }}>Pour l&apos;organisme de formation mandataire,</Text>
            <Text style={{ fontSize: 8, color: SURFACE_700, marginBottom: 6 }}>
              {`${org?.name || 'Lab Learning'} — ${representantOF}`}
            </Text>
            <Text style={{ fontSize: 7.5, color: SURFACE_400, marginBottom: 4 }}>Signature :</Text>
            {org?.tampon_signature_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <PdfImage src={org.tampon_signature_url} style={{ width: 130, height: 62, objectFit: 'contain', alignSelf: 'flex-start' }} />
            ) : null}
          </View>
        </View>

        <PdfDocFooter numero={`Mandat POEI — ${poei?.numero || ''}`} org={org} />
      </Page>
    </Document>
  )
}
