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

  const type = String(form.get('type') || 'autre')

  const supabase = await createServiceRoleClient()

  const { data: org } = await supabase.from('organizations').select('id').limit(1).maybeSingle()
  if (!org) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 500 })
  const orgId = (org as any).id

  // ── Cible : une session, ou un formateur ──
  const refSession = String(form.get('session_reference') || '').trim()
  const emailFormateur = String(form.get('formateur_email') || '').trim().toLowerCase()

  let sessionId: string | null = null
  let clientId: string | null = null
  let formateurId: string | null = null
  let libelleCible = ''

  if (refSession && !TYPES_SESSION.has(type)) {
    return NextResponse.json({ error: `Type de session inconnu : ${type}` }, { status: 400 })
  }
  if (emailFormateur && !refSession && !TYPES_FORMATEUR.has(type)) {
    return NextResponse.json({ error: `Type de pièce formateur inconnu : ${type}` }, { status: 400 })
  }

  if (refSession) {
    const { data: s } = await supabase
      .from('sessions').select('id, client_id, reference')
      .eq('organization_id', orgId).eq('reference', refSession).maybeSingle()
    if (!s) return NextResponse.json({ error: `Session ${refSession} introuvable` }, { status: 404 })
    sessionId = (s as any).id
    clientId = (s as any).client_id || null
    libelleCible = refSession
  } else if (emailFormateur) {
    const { data: f } = await supabase
      .from('formateurs').select('id, prenom, nom')
      .eq('organization_id', orgId).ilike('email', emailFormateur).limit(1).maybeSingle()
    if (!f) return NextResponse.json({ error: `Formateur ${emailFormateur} introuvable` }, { status: 404 })
    formateurId = (f as any).id
    libelleCible = `${(f as any).prenom || ''} ${(f as any).nom || ''}`.trim()
  } else {
    return NextResponse.json({ error: 'Indiquez session_reference ou formateur_email' }, { status: 400 })
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
