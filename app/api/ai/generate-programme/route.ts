import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateProgrammeFormation } from '@/lib/ai'

export async function POST(request: Request) {
  const anonClient = await createServerSupabaseClient()
  const { data: { user } } = await anonClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const { intitule, categorie, duree_heures, modalite } = body

  if (!intitule) {
    return NextResponse.json({ error: 'Intitulé requis' }, { status: 400 })
  }

  const result = await generateProgrammeFormation({
    intitule,
    categorie: categorie || 'Formation professionnelle',
    duree_heures: duree_heures || 14,
    modalite: modalite || 'presentiel',
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ programme: result.programme })
}
