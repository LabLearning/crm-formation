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
  const n = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/feuille[_ -]*emargement|emargement|presence/.test(n)) return 'emargement_signe'
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
  const type = typeDemande === 'auto' ? typeDApresNom(fichier.name) : typeDemande

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
  let libelleCible = ''

  const cibleFormateur = !!(emailFormateur || nomFormateur)
  const cibleSession = !!(refSession || dendreoId || (numeroDossier && !cibleFormateur))
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
    return NextResponse.json(
      { error: 'Indiquez session_reference, dendreo_id, formateur_email ou formateur_nom' },
      { status: 400 },
    )
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
