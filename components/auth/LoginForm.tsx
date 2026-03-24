'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema } from '@/lib/validations/auth'
import { Input } from '@/components/ui'

export function LoginForm() {
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
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const parsed = loginSchema.safeParse(raw)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>)
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (authError) {
      setError('Email ou mot de passe incorrect')
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-surface-900 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <span className="text-lg font-heading font-bold text-surface-900 tracking-tight">FormaCRM</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">
          Connexion
        </h1>
        <p className="text-surface-500 text-sm">
          Accédez à votre espace de gestion
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

      <div className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Adresse email"
          placeholder="vous@organisme.fr"
          autoComplete="email"
          error={fieldErrors.email?.[0]}
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Mot de passe"
          placeholder="Votre mot de passe"
          autoComplete="current-password"
          error={fieldErrors.password?.[0]}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full h-11 group"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Se connecter
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-surface-500">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-surface-900 font-medium hover:text-brand-600 transition-colors">
          Créer un compte
        </Link>
      </p>
    </form>
  )
}
