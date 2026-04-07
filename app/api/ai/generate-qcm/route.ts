import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateQCMQuestions } from '@/lib/ai'

export async function POST(request: Request) {
  const anonClient = await createServerSupabaseClient()
  const { data: { user } } = await anonClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const { formationTitle, theme, niveau, nbQuestions } = body

  if (!formationTitle || !theme) {
    return NextResponse.json({ error: 'Titre et thème requis' }, { status: 400 })
  }

  const result = await generateQCMQuestions({
    formationTitle,
    theme,
    niveau: niveau || 'intermediaire',
    nbQuestions: Math.min(nbQuestions || 10, 20),
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ questions: result.questions })
}
