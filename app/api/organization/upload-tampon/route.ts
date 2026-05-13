import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg']

export async function POST(req: Request) {
  const session = await getSession()
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 })
  }
  const supabase = await createServiceRoleClient()

  const fd = await req.formData()
  const file = fd.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'PNG ou JPG uniquement' }, { status: 400 })

  // Supprimer l'ancien tampon si présent
  const { data: org } = await supabase
    .from('organizations')
    .select('tampon_signature_url')
    .eq('id', session.organization.id)
    .single()
  if (org?.tampon_signature_url) {
    const oldPath = org.tampon_signature_url.split('/organisation/')[1]
    if (oldPath) await supabase.storage.from('organisation').remove([oldPath])
  }

  const ext = file.name.split('.').pop() || 'png'
  const path = `${session.organization.id}/tampon-${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: upErr } = await supabase.storage
    .from('organisation')
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Bucket public → URL publique directe
  const { data: pub } = supabase.storage.from('organisation').getPublicUrl(path)
  const url = pub.publicUrl

  await supabase
    .from('organizations')
    .update({
      tampon_signature_url: url,
      tampon_signature_filename: file.name,
      tampon_signature_uploaded_at: new Date().toISOString(),
    })
    .eq('id', session.organization.id)

  await logAudit({ action: 'upload_tampon', entity_type: 'organization', entity_id: session.organization.id })
  revalidatePath('/dashboard/settings')
  return NextResponse.json({ success: true, url, filename: file.name })
}

export async function DELETE() {
  const session = await getSession()
  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 })
  }
  const supabase = await createServiceRoleClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('tampon_signature_url')
    .eq('id', session.organization.id)
    .single()
  if (org?.tampon_signature_url) {
    const oldPath = org.tampon_signature_url.split('/organisation/')[1]
    if (oldPath) await supabase.storage.from('organisation').remove([oldPath])
  }

  await supabase
    .from('organizations')
    .update({
      tampon_signature_url: null,
      tampon_signature_filename: null,
      tampon_signature_uploaded_at: null,
    })
    .eq('id', session.organization.id)

  await logAudit({ action: 'delete_tampon', entity_type: 'organization', entity_id: session.organization.id })
  revalidatePath('/dashboard/settings')
  return NextResponse.json({ success: true })
}
