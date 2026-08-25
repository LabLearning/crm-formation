'use server'

import { createElement } from 'react'
import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

/**
 * Studio formateur (espace connecté) : à partir de photos/notes prises en
 * mission, l'IA structure un document propre, mis en page aux couleurs de la
 * franchise (couleurs déduites du logo à la première génération puis
 * mémorisées). Le PDF est archivé dans les documents de la session.
 */
export async function genererDocumentBrandeAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; data?: { documentId: string } }> {
  const session = await getSession()
  if (session.user.role !== 'formateur') return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id
  const { data: formateurRow } = await supabase.from('formateurs')
    .select('id, prenom, nom').eq('user_id', session.user.id).maybeSingle()
  if (!formateurRow) return { success: false, error: 'Fiche formateur introuvable' }
  const context = { formateur: formateurRow }

  const sessionId = String(formData.get('session_id') || '').trim()
  const titreDemande = String(formData.get('titre') || '').trim()
  const consignes = String(formData.get('consignes') || '').trim()
  if (!sessionId) return { success: false, error: 'Choisissez la session concernée' }
  if (!titreDemande && !consignes) return { success: false, error: 'Donnez au moins un titre ou des consignes' }

  // La session doit être au formateur connecté
  const { data: sess } = await supabase.from('sessions')
    .select('id, client_id, formateur_id, client:client_id(raison_sociale, nom_commercial, franchise_id)')
    .eq('id', sessionId).eq('organization_id', orgId).maybeSingle()
  if (!sess || sess.formateur_id !== context.formateur.id) {
    return { success: false, error: 'Session non autorisée' }
  }

  // Le branding : franchise si le client en a une, sinon l'établissement
  let franchise: any = null
  if ((sess as any).client?.franchise_id) {
    const { data: f } = await supabase.from('franchises')
      .select('id, nom, logo_url, couleur_primaire, couleur_secondaire')
      .eq('id', (sess as any).client.franchise_id).maybeSingle()
    franchise = f
  }
  const marqueNom = franchise?.nom || (sess as any).client?.nom_commercial || (sess as any).client?.raison_sociale || 'Établissement'

  // Fichiers sources : photos (vision), PDF (natif API), Word/Excel (texte extrait)
  const fichiers = formData.getAll('fichiers') as File[]
  const images: string[] = []
  const pdfs: Array<{ nom: string; b64: string }> = []
  const textes: Array<{ nom: string; texte: string }> = []
  for (const f of fichiers.slice(0, 5)) {
    if (!f || typeof f.arrayBuffer !== 'function' || f.size === 0) continue
    if (f.size > 4 * 1024 * 1024) return { success: false, error: `« ${f.name} » dépasse 4 Mo` }
    const buf = Buffer.from(await f.arrayBuffer())
    const nomBas = (f.name || '').toLowerCase()
    if (/^image\/(jpeg|png|webp)$/.test(f.type)) {
      images.push(`data:${f.type};base64,${buf.toString('base64')}`)
    } else if (f.type === 'application/pdf' || nomBas.endsWith('.pdf')) {
      pdfs.push({ nom: f.name, b64: buf.toString('base64') })
    } else if (nomBas.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth')
        const r = await mammoth.extractRawText({ buffer: buf })
        textes.push({ nom: f.name, texte: (r.value || '').slice(0, 20000) })
      } catch { return { success: false, error: `Lecture impossible : ${f.name}` } }
    } else if (nomBas.endsWith('.xlsx') || nomBas.endsWith('.xls') || nomBas.endsWith('.csv')) {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(buf, { type: 'buffer' })
        const morceaux: string[] = []
        for (const sheet of wb.SheetNames.slice(0, 5)) {
          morceaux.push(`--- Feuille « ${sheet} » ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[sheet])}`)
        }
        textes.push({ nom: f.name, texte: morceaux.join('\n\n').slice(0, 20000) })
      } catch { return { success: false, error: `Lecture impossible : ${f.name}` } }
    } else {
      return { success: false, error: `Format non géré : ${f.name} (photos, PDF, Word, Excel)` }
    }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { success: false, error: 'Clé IA non configurée (OPENAI_API_KEY)' }

  const doitDeduireCouleurs = !franchise?.couleur_primaire
  const aSources = images.length + pdfs.length + textes.length > 0
  const contenuUser: any[] = [{
    type: 'input_text',
    text: [
      `Marque du document : ${marqueNom}.`,
      titreDemande ? `Titre souhaité : ${titreDemande}` : null,
      consignes ? `Consignes du formateur : ${consignes}` : null,
      aSources ? `Les fichiers joints sont les documents sources (notes, tableaux, affichages) : transcris et structure leur contenu fidèlement, sans rien inventer.` : 'Aucune source : construis le document à partir du titre et des consignes.',
      ...textes.map((t) => `--- Contenu du fichier « ${t.nom} » ---\n${t.texte}`),
      doitDeduireCouleurs && franchise?.logo_url ? 'La dernière image est le LOGO de la marque : déduis-en couleur_primaire et couleur_secondaire (hex, contrastées sur blanc, jamais blanc/noir purs).' : null,
    ].filter(Boolean).join('\n\n'),
  }]
  for (const p of pdfs) contenuUser.push({ type: 'input_file', filename: p.nom, file_data: `data:application/pdf;base64,${p.b64}` })
  for (const img of images) contenuUser.push({ type: 'input_image', image_url: img })
  if (doitDeduireCouleurs && franchise?.logo_url) {
    contenuUser.push({ type: 'input_image', image_url: franchise.logo_url })
  }

  let structure: any
  try {
    // API Responses : elle seule accepte les PDF en entrée directe.
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        text: { format: { type: 'json_object' } },
        instructions: `Tu prépares des documents de formation professionnels en FRANÇAIS pour des restaurants et métiers de bouche. Réponds UNIQUEMENT en JSON : {"titre": string, "sous_titre": string|null, "couleur_primaire": "#RRGGBB"|null, "couleur_secondaire": "#RRGGBB"|null, "sections": [{"titre": string, "paragraphes": string[]|null, "items": string[]|null, "colonnes": string[]|null, "lignes": string[][]|null}]}. Contenu clair, opérationnel, fidèle aux sources. Tableaux pour les plans/plannings, listes pour les consignes. 8 sections maximum.`,
        input: [{ role: 'user', content: contenuUser }],
      }),
    })
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`)
    const j = await r.json()
    const texteSortie = j.output_text
      || (j.output || []).flatMap((o: any) => (o.content || [])).map((c: any) => c.text).filter(Boolean).join('')
    structure = JSON.parse(texteSortie || '{}')
  } catch (e: any) {
    console.error('[studio ia]', e?.message)
    return { success: false, error: 'La génération IA a échoué — réessayez' }
  }
  if (!structure?.titre || !Array.isArray(structure.sections) || structure.sections.length === 0) {
    return { success: false, error: 'Le contenu généré est vide — précisez vos consignes' }
  }

  // Couleurs : mémorisées sur la franchise à la première déduction
  const hex = (v: any) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null)
  let couleur = franchise?.couleur_primaire || hex(structure.couleur_primaire) || '#195144'
  let couleur2 = franchise?.couleur_secondaire || hex(structure.couleur_secondaire) || null
  if (franchise && doitDeduireCouleurs && hex(structure.couleur_primaire)) {
    try {
      await supabase.from('franchises').update({
        couleur_primaire: hex(structure.couleur_primaire),
        couleur_secondaire: hex(structure.couleur_secondaire),
      }).eq('id', franchise.id)
    } catch { /* colonnes absentes avant migration 141 : le document sort quand même */ }
  }

  // Rendu PDF + archivage dans les documents de la session
  try {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const { DocumentBrandePDF } = await import('@/lib/pdf/document-brande-pdf')
    const buffer = await renderToBuffer(createElement(DocumentBrandePDF, {
      doc: structure,
      franchiseNom: marqueNom,
      logoUrl: franchise?.logo_url || null,
      couleur, couleur2,
      formateurNom: `${context.formateur.prenom || ''} ${context.formateur.nom || ''}`.trim() || null,
      dateStr: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    }) as any)

    const slug = String(structure.titre).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'document'
    const path = `${orgId}/studio/${sessionId}/${Date.now()}-${slug}.pdf`
    const { error: eUp } = await supabase.storage.from('documents')
      .upload(path, new Uint8Array(buffer), { contentType: 'application/pdf' })
    if (eUp) throw new Error(eUp.message)

    const { data: docRow, error: eDoc } = await supabase.from('documents').insert({
      organization_id: orgId,
      nom: `${structure.titre} — ${marqueNom}`,
      type: 'support_pedagogique',
      session_id: sessionId,
      formateur_id: context.formateur.id,
      storage_path: path,
      file_name: `${slug}.pdf`,
      file_size: buffer.length,
      mime_type: 'application/pdf',
      visibilite: 'tous',
      origine: 'studio_formateur',
    }).select('id').single()
    if (eDoc) throw new Error(eDoc.message)

    revalidatePath('/mon-espace/studio')
    return { success: true, data: { documentId: docRow.id } }
  } catch (e: any) {
    console.error('[studio pdf]', e?.message)
    return { success: false, error: 'Mise en page du document impossible — réessayez' }
  }
}
