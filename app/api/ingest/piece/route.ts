/**
 * Dépôt d'une pièce justificative depuis une source externe.
 *
 * Les feuilles d'émargement papier et les dossiers de qualification des
 * formateurs vivent dans la boîte mail, jamais dans le CRM. Les faire passer
 * par un écran de dépôt, fichier par fichier, représente des heures ; les
 * faire transiter par un dossier Drive rendu public exposerait des cartes
 * d'identité. Cette route est la troisième voie : un script Apps Script,
 * exécuté sur le compte qui possède déjà les fichiers, les pousse ici
 * directement.
 *
 * Authentification : en-tête « Authorization: Bearer <CRON_SECRET> ».
 * Fail-closed — sans secret configuré, la route refuse tout.
 *
 * La pièce se rattache soit à une session (par sa référence), soit à un
 * formateur (par son email). Le dépôt est idempotent sur le nom de fichier
 * d'origine : relancer le script ne crée pas de doublon.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Une pièce de session et une pièce de formateur ne se rangent pas au même
// endroit : la fiche formateur lit `file_url` dans le bucket « dossiers »,
// la fiche session lit `storage_path` dans le bucket « documents ».
const TYPES_SESSION = new Set([
  'emargement_signe', 'convention_signee', 'contrat_formateur', 'evaluation_acquis',
  'satisfaction', 'positionnement', 'recueil_besoin', 'accord_prise_en_charge',
  'attestation_fin', 'certificat_realisation', 'programme', 'facture', 'autre',
])
const TYPES_FORMATEUR = new Set([
  'cv', 'diplome', 'habilitation', 'attestation_formation_continue',
  'attestation_urssaf', 'kbis', 'nda', 'responsabilite_civile',
  'attestation_fiscale', 'rib', 'piece_identite', 'autre',
])

/**
 * Type de pièce déduit du nom de fichier.
 *
 * L'export Dendreo nomme ses documents de façon stable — « Feuille_emargement
 * - … », « Convention_formation - … », « Contrat_sous-traitance_… ». Le script
 * qui pousse les fichiers n'a donc pas à connaître la nomenclature du CRM.
 * Une pièce non reconnue est rangée en « autre » plutôt que refusée : mieux
 * vaut un document au dossier mal étiqueté qu'un document perdu.
 */
function typeDApresNom(nom: string): string {
  // Le fichier collecté porte un préfixe « date__expediteur__ » : les motifs
  // ancrés en début de nom doivent viser le nom d'origine, pas la date.
  const brut = nom.replace(/^\d{4}-\d{2}-\d{2}__[^_]*__/, '')
  const n = brut.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  // Abréviations maison, relevées dans la boîte : « FE CLIENT », « CR NOM »,
  // « AF NOM ». Elles ne veulent rien dire hors contexte, d'où l'ancrage en
  // début de nom pour éviter de happer un mot quelconque.
  if (/^fe[ _-]/.test(n)) return 'emargement_signe'
  if (/^cr[ _-]/.test(n)) return 'certificat_realisation'
  if (/^af[ _-]/.test(n)) return 'attestation_fin'
  if (/rapport[_ -]*satisfaction/.test(n)) return 'satisfaction'
  if (/feuille[_ -]*d?[_ ']*emargement|emargement|presence/.test(n)) return 'emargement_signe'
  if (/convention/.test(n)) return 'convention_signee'
  if (/contrat[_ -]*(sous[_ -]*trait|formateur|prestation)/.test(n)) return 'contrat_formateur'
  if (/certificat[_ -]*(de[_ -]*)?realisation/.test(n)) return 'certificat_realisation'
  if (/attestation[_ -]*(de[_ -]*)?(fin|assiduite|formation)/.test(n)) return 'attestation_fin'
  if (/evaluation[_ -]*(des[_ -]*)?acquis|test[_ -]*sortie/.test(n)) return 'evaluation_acquis'
  if (/positionnement|test[_ -]*entree|diagnostic/.test(n)) return 'positionnement'
  if (/satisfaction|questionnaire[_ -]*chaud|a[_ -]*froid/.test(n)) return 'satisfaction'
  if (/recueil|besoin/.test(n)) return 'recueil_besoin'
  if (/prise[_ -]*en[_ -]*charge|accord/.test(n)) return 'accord_prise_en_charge'
  if (/programme/.test(n)) return 'programme'
  if (/facture/.test(n)) return 'facture'
  return 'autre'
}

/**
 * Type de pièce d'un dossier formateur.
 *
 * Le vocabulaire n'est pas celui des sessions et les deux se contredisent :
 * « attestation de formation » désigne l'attestation remise au stagiaire dans
 * un dossier de session, et le justificatif de qualification du formateur dans
 * son dossier à lui. D'où deux lectures séparées, choisies selon la cible.
 *
 * L'ordre compte : « Diplome-Certificat-Habilitation.pdf » doit être rangé en
 * diplôme, pas en habilitation, et « urssaf-attestation-vigilance » n'est pas
 * une attestation de formation.
 */
function typeFormateurDApresNom(nom: string): string {
  const brut = nom.replace(/^\d{4}-\d{2}-\d{2}__[^_]*__/, '')
  // Le souligné est un caractère de mot : « CV_MARTIN » et « Certificat_SST »
  // échappent à \b. On délimite sur « ni lettre ni chiffre » à la place.
  const n = brut.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const mot = (m: string) => new RegExp(`(?:^|[^a-z0-9])${m}(?![a-z0-9])`).test(n)
  if (mot('cv') || /curriculum/.test(n)) return 'cv'
  if (mot('bts') || mot('cap') || /diplome|master|licence|titre[_ -]*professionnel/.test(n)) return 'diplome'
  if (/urssaf|vigilance|affiliation/.test(n)) return 'attestation_urssaf'
  if (/kbis|extrait[_ -]*k/.test(n)) return 'kbis'
  if (mot('nda') || /declaration[_ -]*d?[_ ']*activite|recepisse/.test(n)) return 'nda'
  if (/responsabilite[_ -]*civile|rc[_ -]*pro|assurance/.test(n)) return 'responsabilite_civile'
  if (/fiscal|regularite/.test(n)) return 'attestation_fiscale'
  if (mot('rib') || /iban|releve[_ -]*d?[_ ']*identite[_ -]*bancaire/.test(n)) return 'rib'
  if (mot('cni') || /carte[_ -]*d?[_ ']*identite|passeport|sejour|residence[_ -]*permit|piece[_ -]*d?[_ ']*identite/.test(n)) return 'piece_identite'
  if (mot('sst') || mot('fpa') || /habilitation|qualification|haccp|agrement/.test(n)) return 'habilitation'
  if (/certificat|attestation[_ -]*(de[_ -]*)?formation/.test(n)) return 'attestation_formation_continue'
  return 'autre'
}

export async function POST(request: NextRequest) {
  const attendu = process.env.CRON_SECRET
  if (!attendu) return NextResponse.json({ error: 'Route non configurée' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${attendu}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Corps illisible' }, { status: 400 })
  }

  const fichier = form.get('fichier') as File | null
  if (!fichier || fichier.size === 0) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  if (fichier.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop lourd' }, { status: 413 })

  // « auto » : le script pousse les fichiers sans les connaître, le type se
  // déduit ici du nom que Dendreo leur a donné.
  const typeDemande = String(form.get('type') || 'auto')
  let type = typeDemande === 'auto' ? typeDApresNom(fichier.name) : typeDemande

  const supabase = await createServiceRoleClient()

  const { data: org } = await supabase.from('organizations').select('id').limit(1).maybeSingle()
  if (!org) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 500 })
  const orgId = (org as any).id

  // ── Cible : une session (référence ou identifiant Dendreo), ou un formateur ──
  const refSession = String(form.get('session_reference') || '').trim()
  const dendreoId = String(form.get('dendreo_id') || '').trim()
  const emailFormateur = String(form.get('formateur_email') || '').trim().toLowerCase()
  const nomFormateur = String(form.get('formateur_nom') || '').trim()

  // Dernier recours : le numéro de dossier OPCO, souvent le seul repère fiable.
  // Les accords AKTO le portent dans leur nom — « dossier_accord2503af013110 »
  // — et il désigne la session, tantôt par sa référence (actions reprises de
  // 2025), tantôt par son financement (actions 2026).
  const numeroDossier = (
    String(form.get('numero_dossier') || '').trim() ||
    (fichier.name.match(/(\d{4}AF\d{6})/i)?.[1] || '')
  ).toUpperCase()

  let sessionId: string | null = null
  let clientId: string | null = null
  let formateurId: string | null = null
  let apprenantId: string | null = null
  let libelleCible = ''

  const cibleFormateur = !!(emailFormateur || nomFormateur)
  const cibleSession = !!(refSession || dendreoId || (numeroDossier && !cibleFormateur))
  // Le vocabulaire dépend de la cible : on ne peut trancher qu'ici.
  if (typeDemande === 'auto' && cibleFormateur && !cibleSession) {
    type = typeFormateurDApresNom(fichier.name)
  }
  if (cibleSession && !TYPES_SESSION.has(type)) {
    return NextResponse.json({ error: `Type de session inconnu : ${type}` }, { status: 400 })
  }
  if (!cibleSession && cibleFormateur && !TYPES_FORMATEUR.has(type)) {
    return NextResponse.json({ error: `Type de pièce formateur inconnu : ${type}` }, { status: 400 })
  }

  if (cibleSession) {
    const base = () => supabase.from('sessions').select('id, client_id, reference').eq('organization_id', orgId)
    let s: any = null
    if (refSession) {
      ({ data: s } = await base().eq('reference', refSession).limit(1).maybeSingle())
    } else if (dendreoId) {
      ({ data: s } = await base().eq('dendreo_id', dendreoId).limit(1).maybeSingle())
    } else {
      // Le numéro sert de référence sur les actions reprises, de numéro de
      // financement sur les autres : on essaie les deux.
      ({ data: s } = await base().eq('reference', numeroDossier).limit(1).maybeSingle())
      if (!s) ({ data: s } = await base().eq('numero_dossier_opco', numeroDossier).limit(1).maybeSingle())
    }
    if (!s) {
      return NextResponse.json(
        {
          error: `Session introuvable (${refSession || (dendreoId && 'dendreo ' + dendreoId) || numeroDossier})`,
          introuvable: true,
        },
        { status: 404 },
      )
    }
    sessionId = (s as any).id
    clientId = (s as any).client_id || null
    libelleCible = (s as any).reference || `dendreo ${dendreoId}`
  } else if (cibleFormateur) {
    const trouve = await retrouverFormateur(supabase, orgId, emailFormateur, nomFormateur)
    if ('erreur' in trouve) return NextResponse.json(trouve.erreur, { status: trouve.statut })
    formateurId = trouve.id
    libelleCible = trouve.libelle
  } else {
    // Dernier recours : deviner la session d'après le nom du client et la date
    // du mail, tous deux présents dans le nom du fichier collecté
    // (« 2025-05-13__sales@…__FE SQUADRA 15.pdf »).
    // L'objet du mail nomme le client bien plus sûrement que le fichier :
    // « Feuilles d'émargement — Chicken Street Amiens » contre « J1.png ».
    const trouve = await deviner(
      supabase, orgId, fichier.name,
      String(form.get('objet') || '').trim(),
      String(form.get('date_mail') || '').trim(),
    )
    if ('erreur' in trouve) return NextResponse.json(trouve.erreur, { status: trouve.statut })
    sessionId = trouve.id
    clientId = trouve.clientId
    apprenantId = trouve.apprenantId || null
    libelleCible = trouve.libelle
  }

  // ── Idempotence : même fichier, même cible → on ne redépose pas ──
  const dejaLa = supabase.from('documents').select('id').eq('organization_id', orgId).eq('file_name', fichier.name)
  const { data: existant } = await (sessionId
    ? dejaLa.eq('session_id', sessionId)
    : dejaLa.eq('formateur_id', formateurId as string)
  ).maybeSingle()
  if (existant) {
    return NextResponse.json({ ok: true, deja_depose: true, id: (existant as any).id, cible: libelleCible })
  }

  const ext = (fichier.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '')
  const bucket = sessionId ? 'documents' : 'dossiers'
  const dossier = sessionId ? `sessions/${sessionId}` : `formateurs/${formateurId}`
  const chemin = `${orgId}/${dossier}/${type}-${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(chemin, Buffer.from(await fichier.arrayBuffer()), {
      contentType: fichier.type || 'application/pdf',
      upsert: false,
    })
  if (upErr) {
    console.error('[ingest piece]', upErr.message)
    return NextResponse.json({ error: 'Dépôt du fichier impossible' }, { status: 500 })
  }

  const { data, error } = await supabase.from('documents').insert({
    organization_id: orgId,
    nom: String(form.get('nom') || '').trim() || fichier.name.replace(/\.[^.]+$/, ''),
    type,
    session_id: sessionId,
    client_id: clientId,
    formateur_id: formateurId,
    apprenant_id: apprenantId,
    // La fiche session lit `storage_path`, la fiche formateur lit `file_url`.
    ...(sessionId ? { storage_path: chemin } : { file_url: chemin }),
    file_name: fichier.name,
    file_size: fichier.size,
    mime_type: fichier.type || null,
    origine: String(form.get('origine') || 'mail'),
    date_piece: String(form.get('date_piece') || '') || null,
    description: String(form.get('description') || '') || null,
  }).select('id').single()

  if (error) {
    // Le fichier est déjà déposé : on le retire pour ne pas laisser d'orphelin.
    await supabase.storage.from(bucket).remove([chemin])
    console.error('[ingest piece]', error)
    return NextResponse.json({ error: 'Enregistrement impossible', detail: error.message }, { status: 500 })
  }

  // La fiche formateur et le compteur de l'indicateur 21 lisent `cv_url` : un CV
  // déposé qui n'y figure pas reste invisible là où on le cherche.
  if (formateurId && type === 'cv') {
    await supabase.from('formateurs')
      .update({ cv_url: chemin })
      .eq('id', formateurId).eq('organization_id', orgId)
  }

  return NextResponse.json({ ok: true, id: data.id, cible: libelleCible, type })
}

/**
 * Retrouve un formateur par son email, à défaut par son nom.
 *
 * Les intervenants écrivent depuis plusieurs adresses — professionnelle,
 * personnelle, celle de leur société — et une seule est enregistrée. Le nom
 * devient alors la clé de repli.
 *
 * Une homonymie n'est jamais tranchée au hasard : on renvoie les candidats et
 * on laisse l'appelant choisir. Rattacher le diplôme d'un formateur à la
 * fiche d'un autre serait pire que ne rien déposer.
 */
async function retrouverFormateur(
  supabase: any,
  orgId: string,
  email: string,
  nom: string,
): Promise<{ id: string; libelle: string } | { erreur: any; statut: number }> {
  const libelleDe = (f: any) => `${f.prenom || ''} ${f.nom || ''}`.trim()

  if (email) {
    const { data } = await supabase
      .from('formateurs').select('id, prenom, nom')
      .eq('organization_id', orgId).ilike('email', email).limit(1).maybeSingle()
    if (data) return { id: (data as any).id, libelle: libelleDe(data) }
  }

  if (!nom) {
    return { erreur: { error: `Formateur ${email} introuvable`, introuvable: true }, statut: 404 }
  }

  // Comparaison dépouillée : accents, tirets et casse ne doivent pas séparer
  // « Jean-Philippe MA » de « jean philippe ma ».
  const nu = (v: string) =>
    (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

  const { data: tous } = await supabase
    .from('formateurs').select('id, prenom, nom, email').eq('organization_id', orgId)

  const cherche = nu(nom)
  const motsCherches = cherche.split(' ').filter((m: string) => m.length > 1)

  const candidats = (tous || []).filter((f: any) => {
    const complet = nu(`${f.prenom || ''} ${f.nom || ''}`)
    if (complet === cherche) return true
    const mots = complet.split(' ').filter((m: string) => m.length > 1)
    // Tous les mots cherchés se retrouvent dans le nom enregistré, ou l'inverse.
    return motsCherches.length > 0 && (
      motsCherches.every((m: string) => mots.includes(m)) ||
      mots.every((m: string) => motsCherches.includes(m))
    )
  })

  if (candidats.length === 1) {
    return { id: candidats[0].id, libelle: libelleDe(candidats[0]) }
  }
  if (candidats.length === 0) {
    return { erreur: { error: `Formateur « ${nom} » introuvable`, introuvable: true }, statut: 404 }
  }
  return {
    erreur: {
      error: `Plusieurs formateurs correspondent à « ${nom} »`,
      ambigu: true,
      candidats: candidats.map((f: any) => ({ nom: libelleDe(f), email: f.email })),
    },
    statut: 409,
  }
}


/** Texte comparable : sans accents, sans ponctuation, en majuscules. */
function mots(v: string): string[] {
  return (v || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ')
    .split(' ').filter((m) => m.length >= 3)
}

// Mots trop courants pour identifier un client : ils sont dans la moitié des
// raisons sociales du secteur, ou décrivent le document lui-même.
const BANALS = new Set([
  'SAS', 'SARL', 'SASU', 'EURL', 'SNC', 'GROUPE', 'FRANCE', 'THE', 'LES', 'DES',
  'FEUILLE', 'EMARGEMENT', 'CERTIFICAT', 'REALISATION', 'ATTESTATION', 'FORMATION',
  'CONVENTION', 'RAPPORT', 'SATISFACTION', 'CHAUD', 'FROID', 'PROGRAMME', 'SIGNE',
  'SIGNED', 'FINAL', 'FINALE', 'COPIE', 'HYGIENE', 'ALIMENTAIRE', 'PREVENTION',
  'RISQUES', 'DUERP', 'ACCUEIL', 'CLIENT', 'PDF', 'DOC', 'LAB', 'LEARNING',
])

/**
 * Retrouve la session d'une pièce à partir du nom du fichier collecté.
 *
 * Le nom porte la date du mail et, presque toujours, le nom du client —
 * « FE SQUADRA 15 », « Feuille d'émargement … Chicken Street Plombières ».
 * On identifie donc le client, puis sa session la plus proche de cette date.
 *
 * Le principe qui gouverne tout : en cas de doute, ne rien faire. Une pièce
 * rattachée à la mauvaise session est pire qu'une pièce non rattachée — elle
 * est invisible et fausse deux dossiers à la fois.
 */
async function deviner(
  supabase: any,
  orgId: string,
  nomFichier: string,
  objet?: string,
  dateMailFournie?: string,
): Promise<
  { id: string; clientId: string | null; apprenantId?: string | null; libelle: string }
  | { erreur: any; statut: number }
> {
  const m = nomFichier.match(/^(\d{4}-\d{2}-\d{2})__([^_]*)__(.+)$/)
  const dateMail = dateMailFournie || m?.[1] || ''
  const expediteur = (m?.[2] || '').toLowerCase()
  const libelle = objet || m?.[3] || nomFichier
  if (!dateMail) {
    return { erreur: { error: 'Date du mail inconnue', introuvable: true }, statut: 404 }
  }

  // L'objet du mail passe avant le nom du fichier : « Émargements L'Original »
  // désigne un client, « presence.pdf » ne désigne rien.
  const source = [objet, m?.[3] || nomFichier].filter(Boolean).join(' ')
  const distinctifs = mots(source.replace(/\.[^.]+$/, '')).filter((w) => !BANALS.has(w))
  if (distinctifs.length === 0) {
    return await devinerParFormateur(supabase, orgId, expediteur, dateMail, libelle)
  }

  const { data: clients } = await supabase
    .from('clients').select('id, raison_sociale, nom_commercial').eq('organization_id', orgId)

  const candidats = (clients || []).filter((c: any) => {
    const sien = new Set([...mots(c.raison_sociale), ...mots(c.nom_commercial)].filter((w) => !BANALS.has(w)))
    if (sien.size === 0) return false
    // Il faut qu'un mot distinctif du client figure dans le nom du fichier.
    return [...sien].some((w) => distinctifs.includes(w))
  })

  // Beaucoup de pièces sont nominatives — certificats, attestations — et
  // portent le nom du stagiaire, pas celui de l'entreprise. On passe alors
  // par l'apprenant, ce qui donne en prime le rattachement à sa fiche.
  if (candidats.length === 0) {
    const parAppr = await devinerParApprenant(supabase, orgId, distinctifs, dateMail, libelle)
    if (!('erreur' in parAppr)) return parAppr
    return await devinerParFormateur(supabase, orgId, expediteur, dateMail, libelle)
  }
  if (candidats.length > 1) {
    return {
      erreur: {
        error: `Plusieurs clients correspondent à « ${libelle} »`,
        ambigu: true,
        candidats: candidats.slice(0, 6).map((c: any) => c.raison_sociale),
      },
      statut: 409,
    }
  }

  // La pièce est envoyée après la formation, rarement plus de quatre mois.
  const client = candidats[0]
  const debut = new Date(dateMail); debut.setDate(debut.getDate() - 130)
  const fin = new Date(dateMail); fin.setDate(fin.getDate() + 20)

  const { data: sessions } = await supabase
    .from('sessions').select('id, reference, date_debut')
    .eq('organization_id', orgId).eq('client_id', client.id)
    .gte('date_debut', debut.toISOString().slice(0, 10))
    .lte('date_debut', fin.toISOString().slice(0, 10))
    .order('date_debut', { ascending: false })

  if (!sessions || sessions.length === 0) {
    return {
      erreur: { error: `${client.raison_sociale} : aucune session autour du ${dateMail}`, introuvable: true },
      statut: 404,
    }
  }
  if (sessions.length > 1) {
    return {
      erreur: {
        error: `${client.raison_sociale} : ${sessions.length} sessions possibles autour du ${dateMail}`,
        ambigu: true,
        candidats: sessions.map((s: any) => `${s.reference} (${s.date_debut})`),
      },
      statut: 409,
    }
  }

  return { id: sessions[0].id, clientId: client.id, libelle: sessions[0].reference }
}


/** Repli : la pièce porte le nom d'un stagiaire plutôt que celui du client. */
async function devinerParApprenant(
  supabase: any,
  orgId: string,
  distinctifs: string[],
  dateMail: string,
  libelleFichier: string,
): Promise<
  { id: string; clientId: string | null; apprenantId: string; libelle: string }
  | { erreur: any; statut: number }
> {
  const { data: apprenants } = await supabase
    .from('apprenants').select('id, prenom, nom').eq('organization_id', orgId).range(0, 9999)

  // Nom ET prénom doivent figurer : un nom seul est trop souvent partagé.
  const candidats = (apprenants || []).filter((a: any) => {
    const n = mots(a.nom).filter((w) => !BANALS.has(w))
    const p = mots(a.prenom).filter((w) => !BANALS.has(w))
    if (n.length === 0 || p.length === 0) return false
    return n.some((w) => distinctifs.includes(w)) && p.some((w) => distinctifs.includes(w))
  })

  if (candidats.length === 0) {
    return { erreur: { error: `Ni client ni stagiaire reconnu dans « ${libelleFichier} »`, introuvable: true }, statut: 404 }
  }
  if (candidats.length > 1) {
    return {
      erreur: {
        error: `Plusieurs stagiaires correspondent à « ${libelleFichier} »`,
        ambigu: true,
        candidats: candidats.slice(0, 6).map((a: any) => `${a.prenom} ${a.nom}`),
      },
      statut: 409,
    }
  }

  const appr = candidats[0]
  const debut = new Date(dateMail); debut.setDate(debut.getDate() - 130)
  const fin = new Date(dateMail); fin.setDate(fin.getDate() + 20)

  const { data: insc } = await supabase
    .from('inscriptions')
    .select('session:session_id(id, reference, date_debut, client_id)')
    .eq('organization_id', orgId).eq('apprenant_id', appr.id)

  const sessions = (insc || [])
    .map((i: any) => i.session).filter(Boolean)
    .filter((s: any) => s.date_debut >= debut.toISOString().slice(0, 10)
                     && s.date_debut <= fin.toISOString().slice(0, 10))

  if (sessions.length === 0) {
    return {
      erreur: { error: `${appr.prenom} ${appr.nom} : aucune session autour du ${dateMail}`, introuvable: true },
      statut: 404,
    }
  }
  if (sessions.length > 1) {
    return {
      erreur: {
        error: `${appr.prenom} ${appr.nom} : ${sessions.length} sessions possibles autour du ${dateMail}`,
        ambigu: true,
        candidats: sessions.map((s: any) => `${s.reference} (${s.date_debut})`),
      },
      statut: 409,
    }
  }

  return {
    id: sessions[0].id,
    clientId: sessions[0].client_id || null,
    apprenantId: appr.id,
    libelle: `${sessions[0].reference} · ${appr.prenom} ${appr.nom}`,
  }
}


/**
 * Dernier repli : la pièce ne nomme ni client ni stagiaire.
 *
 * C'est le cas des photos de feuilles signées — « J1.png », « haccp j2.png »,
 * « img124.jpg » — que certains formateurs prennent en fin de journée. Le nom
 * ne dit rien, mais l'expéditeur et la date disent tout : ce formateur, cette
 * période. Si une seule de ses sessions tombe dans la fenêtre, c'est elle.
 */
async function devinerParFormateur(
  supabase: any,
  orgId: string,
  expediteur: string,
  dateMail: string,
  libelleFichier: string,
): Promise<
  { id: string; clientId: string | null; apprenantId?: string | null; libelle: string }
  | { erreur: any; statut: number }
> {
  if (!expediteur.includes('@')) {
    return { erreur: { error: `Expéditeur inconnu pour « ${libelleFichier} »`, introuvable: true }, statut: 404 }
  }

  const { data: form } = await supabase
    .from('formateurs').select('id, prenom, nom')
    .eq('organization_id', orgId).ilike('email', expediteur).limit(1).maybeSingle()
  if (!form) {
    return {
      erreur: { error: `${expediteur} n'est pas un formateur connu`, introuvable: true },
      statut: 404,
    }
  }

  // Une feuille est photographiée le jour même ou peu après, jamais des mois
  // plus tard : fenêtre volontairement courte pour éviter les faux positifs.
  const debut = new Date(dateMail); debut.setDate(debut.getDate() - 45)
  const fin = new Date(dateMail); fin.setDate(fin.getDate() + 5)

  const { data: sessions } = await supabase
    .from('sessions').select('id, reference, date_debut, client_id')
    .eq('organization_id', orgId).eq('formateur_id', (form as any).id)
    .gte('date_debut', debut.toISOString().slice(0, 10))
    .lte('date_debut', fin.toISOString().slice(0, 10))
    .order('date_debut', { ascending: false })

  const nom = `${(form as any).prenom || ''} ${(form as any).nom || ''}`.trim()
  if (!sessions || sessions.length === 0) {
    return {
      erreur: { error: `${nom} : aucune session autour du ${dateMail}`, introuvable: true },
      statut: 404,
    }
  }
  if (sessions.length > 1) {
    return {
      erreur: {
        error: `${nom} : ${sessions.length} sessions possibles autour du ${dateMail}`,
        ambigu: true,
        candidats: sessions.map((s: any) => `${s.reference} (${s.date_debut})`),
      },
      statut: 409,
    }
  }

  return {
    id: sessions[0].id,
    clientId: sessions[0].client_id || null,
    libelle: `${sessions[0].reference} · ${nom}`,
  }
}
