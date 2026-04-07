'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema } from '@/lib/validations/auth'
import { Input } from '@/components/ui'

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const raw = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      organization_name: formData.get('organization_name') as string,
    }

    const parsed = registerSchema.safeParse(raw)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>)
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          organization_name: parsed.data.organization_name,
        },
      },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Un compte existe déjà avec cet email')
      } else {
        setError('Erreur lors de la création du compte')
      }
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Logo */}
      <div className="flex items-center mb-6">
        <img src="/logo-lablearning.svg" alt="Lab Learning" className="h-10" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">
          Créer un compte
        </h1>
        <p className="text-surface-500 text-sm">
          Configurez votre organisme de formation
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-danger-50 border border-danger-100 px-4 py-3 text-sm text-danger-700 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      <Input
        id="organization_name"
        name="organization_name"
        label="Nom de l'organisme"
        placeholder="Mon Organisme de Formation"
        error={fieldErrors.organization_name?.[0]}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input id="first_name" name="first_name" label="Prénom" placeholder="Jean" error={fieldErrors.first_name?.[0]} />
        <Input id="last_name" name="last_name" label="Nom" placeholder="Dupont" error={fieldErrors.last_name?.[0]} />
      </div>

      <Input
        id="email" name="email" type="email" label="Adresse email"
        placeholder="vous@organisme.fr" autoComplete="email" error={fieldErrors.email?.[0]}
      />

      <Input
        id="password" name="password" type="password" label="Mot de passe"
        placeholder="8 caractères min." hint="Majuscule et chiffre requis"
        autoComplete="new-password" error={fieldErrors.password?.[0]}
      />

      <button type="submit" disabled={isLoading} className="btn-primary w-full h-11 group">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Créer mon compte
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-surface-500">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-surface-900 font-medium hover:text-brand-600 transition-colors">
          Se connecter
        </Link>
      </p>
    </form>
  )
}
