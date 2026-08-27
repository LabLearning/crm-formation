import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'

/**
 * Demande préalable de financement AGEFICE : remplit l'IMPRIMÉ OFFICIEL
 * (formulaire PDF éditable 2025/2026) avec les données du dossier — le
 * dirigeant n'a plus qu'à choisir son diplôme, cocher son ancienneté et signer.
 * [id] = dossier AGEFICE.
 */
export const dynamic = 'force-dynamic'

const frDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error

  const supabase = await createServiceRoleClient()
  const { data: d } = await supabase.from('dossiers_agefice')
    .select(`*,
      client:client_id(raison_sociale, nom_commercial, code_naf, siret, secteur_activite, forme_juridique, adresse, code_postal, ville),
      apprenant:apprenant_id(civilite, prenom, nom, date_naissance, numero_securite_sociale, telephone, email),
      formation:formation_id(intitule, categorie),
      session:session_id(date_debut, date_fin, lieu, adresse, code_postal, ville, formateur:formateurs(prenom, nom))`)
    .eq('id', params.id).eq('organization_id', auth.user.organizationId).maybeSingle()
  if (!d) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

  const { data: org } = await supabase.from('organizations').select('*').eq('id', auth.user.organizationId).single()

  // Nombre d'inscrits : décide présentiel individuel vs collectif
  let nbInscrits = 1
  if (d.session_id) {
    const { count } = await supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('session_id', d.session_id)
    nbInscrits = count || 1
  }

  // Gabarit officiel servi depuis /public
  const gabarit = await fetch(new URL('/gabarits/agefice-demande-pec.pdf', req.url))
  if (!gabarit.ok) return NextResponse.json({ error: 'Gabarit introuvable' }, { status: 500 })
  const doc = await PDFDocument.load(await gabarit.arrayBuffer())
  const form = doc.getForm()

  const texte = (nom: string, valeur?: string | null) => {
    try { if (valeur) form.getTextField(nom).setText(String(valeur)) } catch { /* champ absent */ }
  }
  const coche = (nom: string, oui = true) => {
    try { if (oui) form.getCheckBox(nom).check() } catch { /* champ absent */ }
  }
  const client: any = d.client || {}
  const stagiaire: any = (d as any).apprenant || {}
  const sess: any = (d as any).session || {}

  // ── 1. Point d'accueil ──
  texte('Nom du PTA', d.point_accueil)
  texte('Adresse Email PTA', d.point_accueil_email)

  // ── 2. Entreprise ──
  texte("Nom / Raison Sociale de L'entreprise (Entreprise)", client.raison_sociale)
  texte("Nom commercial de l'entreprise (Entreprise)", client.nom_commercial)
  texte('Code APE - NAF (Entreprise)', client.code_naf)
  texte('N° SIRET (Entreprise)', client.siret)
  texte('Activité Professionnelle (Entreprise)', client.secteur_activite)
  texte('Adresse Entreprise', client.adresse)
  texte('Code Postal (Entreprise)', client.code_postal)
  texte('Ville (Entreprise)', client.ville)
  try {
    const formes = ['ENTREPRISE INDIVIDUELLE', 'MICRO-ENTREPRISE / AUTO-ENTREPRISE', 'SARL', 'EIRL', 'SA', 'SAS', 'SASU']
    const fj = String(client.forme_juridique || '').toUpperCase()
    const opt = formes.find((f) => fj.includes(f.split(' ')[0])) || (fj.includes('MICRO') || fj.includes('AUTO') ? 'MICRO-ENTREPRISE / AUTO-ENTREPRISE' : null)
    if (opt) form.getDropdown('Forme juridique (Entreprise)').select(opt)
  } catch { /* liste absente */ }

  // ── 3. Participant ──
  const estMme = /^(mme|madame)/i.test(String(stagiaire.civilite || ''))
  coche(estMme ? 'MME (Stagiaire)' : 'MR (Stagiaire)', !!stagiaire.nom)
  texte('Nom (Stagiaire)', stagiaire.nom)
  texte('Prénom  (Stagiaire)', stagiaire.prenom)
  texte('Nom de naissance  (Stagiaire)', stagiaire.nom)
  texte('Date de Naissance  (Stagiaire)', frDate(stagiaire.date_naissance))
  texte('N° de Sécurité Sociale  (Stagiaire)', stagiaire.numero_securite_sociale)
  texte('N° de Téléphone  (Stagiaire)', stagiaire.telephone)
  texte('Adresse Email  (Stagiaire)', stagiaire.email)

  // ── 4. Organisme de formation ──
  texte('Raison Sociale ( OF)', org?.legal_name || org?.name)
  texte('NDA (OF)', org?.numero_da)
  texte('N° SIRET (OF)', org?.siret)
  texte('Adresse (OF)', org?.address)
  texte('Code Postal (OF)', org?.postal_code)
  texte('Ville (OF)', org?.city)
  coche('MR (Resp.OF)')
  texte('Nom Responsable (OF)', org?.representant_legal_nom)
  texte('Prénom Responsable (OF)', org?.representant_legal_prenom)
  texte('N° de Téléphone - Responsable (OF)', org?.phone)
  texte('Adresse Email - Responsable (OF)', org?.email)
  coche('MR (Contact OF)')
  texte('Nom - Contact (OF)', 'OUCHRIF')
  texte('Prénom - Contact (OF)', 'Brahim')
  texte('N° de Téléphone - Contact (OF)', org?.phone)
  texte('Adresse Email - Contact (OF)', 'digital@lab-learning.fr')

  // ── 5. Action ──
  coche('Action de Formation')
  texte('Intitulé Exact ( Formation)', (d as any).formation?.intitule)
  texte('Thématique (Formation)', (d as any).formation?.categorie)
  coche(d.categorie === 'obligatoire' ? 'obligatoire (Oui)' : 'Obligatoire (Non)')
  coche('reconversion ( Non)')
  if (d.categorie === 'diplomante_rncp') coche('Titre Homologué')
  else coche('Sans Qualification')
  texte('Date de Début (Formation)', frDate(d.date_debut_formation || sess.date_debut))
  texte('Date de Fin (Formation)', frDate(d.date_fin_formation || sess.date_fin))
  const heures = d.duree_heures ? String(d.duree_heures) : ''
  if (d.modalite === 'distanciel_synchrone') texte('Durée ( FOAD Synchrone - Formation)', heures)
  else if (d.modalite === 'distanciel_asynchrone') texte('Durée ( FOAD Asynchrone - Formation)', heures)
  else if (nbInscrits > 1) texte('Durée ( Présentiel Collectif - Formation)', heures)
  else texte('Durée ( Présentiel Individuel - Formation)', heures)
  texte('Prix Ht (Formation)', d.cout_pedagogique ? String(d.cout_pedagogique) : (d.montant_demande ? String(d.montant_demande) : ''))
  coche('Form en Entreprise (Oui)')
  texte('Nom et Adresse exacte du lieu de formation', [client.raison_sociale, sess.adresse || client.adresse].filter(Boolean).join(' — '))
  texte('Code Postal (Lieu de Formation)', sess.code_postal || client.code_postal)
  texte('Ville (Lieu de Formation)', sess.ville || client.ville)
  texte('Nom du formateur', sess.formateur ? `${sess.formateur.prenom} ${sess.formateur.nom}` : '')

  // ── 6. Modalités de déroulement, suivi et sanction ──
  texte('Déroulement Pédagogique (Formation) - 1 -',
    "Formation en présentiel dans l'entreprise : apports théoriques et mises en situation pratiques, assistance technique et pédagogique assurée par le formateur tout au long de l'action.")
  coche('Feuilles de présence')
  try { form.getCheckBox('Questionnaires, quiz').check() } catch { /* nom différent selon version */ }
  coche('Attestation de Stage')

  // ── Signature ──
  texte('Lieu de Signature', org?.city || 'Montpellier')
  texte('Date de Signature', new Date().toLocaleDateString('fr-FR'))

  const octets = await doc.save()
  const nomFichier = `demande-agefice-${(stagiaire.nom || 'dirigeant').toLowerCase()}.pdf`
  return new NextResponse(new Uint8Array(octets), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomFichier}"`,
    },
  })
}
