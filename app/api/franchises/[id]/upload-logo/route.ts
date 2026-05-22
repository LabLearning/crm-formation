import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const BUCKET = 'organisation'

function isAdmin(role: string) {
  return role === 'super_admin' || role === 'gestionnaire'
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }
  const supabase = await createServiceRoleClient()

  const { data: franchise } = await supabase
    .from('franchises')
    .select('id, logo_url')
    .eq('id', params.id)
    .eq('organization_id', session.organization.id)
    .single()
  if (!franchise) return NextResponse.json({ error: 'Franchise introuvable' }, { status: 404 })

  const fd = await req.formData()
  const file = fd.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'PNG, JPG, SVG ou WebP uniquement' }, { status: 400 })

  // Supprimer l'ancien logo
  if (franchise.logo_url) {
    const oldPath = franchise.logo_url.split(`/${BUCKET}/`)[1]
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath])
  }

  const ext = file.name.split('.').pop() || 'png'
  const path = `franchise-logos/${params.id}/logo-${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = pub.publicUrl

  await supabase.from('franchises').update({ logo_url: url }).eq('id', params.id)

  await logAudit({ action: 'upload_logo', entity_type: 'franchise', entity_id: params.id })
  revalidatePath(`/dashboard/franchises/${params.id}`)
  return NextResponse.json({ success: true, url })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }
  const supabase = await createServiceRoleClient()

  const { data: franchise } = await supabase
    .from('franchises')
    .select('logo_url')
    .eq('id', params.id)
    .eq('organization_id', session.organization.id)
    .single()
  if (franchise?.logo_url) {
    const oldPath = franchise.logo_url.split(`/${BUCKET}/`)[1]
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath])
  }

  await supabase.from('franchises').update({ logo_url: null }).eq('id', params.id)

  await logAudit({ action: 'delete_logo', entity_type: 'franchise', entity_id: params.id })
  revalidatePath(`/dashboard/franchises/${params.id}`)
  return NextResponse.json({ success: true })
}
