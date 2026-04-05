'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock, User, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { setupAccountAction } from './actions'

function SetupForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const uid = searchParams.get('uid') || ''
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!token || !uid) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-danger-100 mb-5">
            <AlertTriangle className="h-7 w-7 text-danger-600" />
          </div>
          <h1 className="text-xl font-heading font-bold text-surface-900 mb-2">Lien invalide</h1>
          <p className="text-surface-500 text-sm mb-6">
            Ce lien d'invitation est invalide ou a expire.
            Demandez a votre administrateur de vous renvoyer une invitation.
          </p>
          <a href="/login" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5">
            Retour a la connexion
          </a>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('token', token)
    formData.set('uid', uid)
    const result = await setupAccountAction(formData)

    if (result.success) {
      // Auto-login with the password just set
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const email = (result.data as any)?.email
      const pwd = formData.get('password') as string
      if (email && pwd) {
        await supabase.auth.signInWithPassword({ email, password: pwd })
      }
      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
    } else {
      setError(result.error || 'Une erreur est survenue')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-success-100 mb-5">
            <CheckCircle2 className="h-7 w-7 text-success-600" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 mb-2">
            Compte active
          </h1>
          <p className="text-surface-500 text-sm">
            Connexion en cours, redirection vers votre tableau de bord...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-4"
            style={{ backgroundColor: '#195144' }}
          >
            <span className="text-white text-xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">
            Bienvenue chez Lab Learning
          </h1>
          <p className="text-surface-500 mt-2 text-sm">
            Finalisez la creation de votre compte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-surface-700 mb-1.5">
                Prenom
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input id="firstName" name="firstName" type="text" placeholder="Jean" required className="input-base pl-10" />
              </div>
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-surface-700 mb-1.5">
                Nom
              </label>
              <input id="lastName" name="lastName" type="text" placeholder="Dupont" required className="input-base" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input id="password" name="password" type="password" placeholder="Minimum 8 caracteres" required minLength={8} className="input-base pl-10" />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-700 mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Retapez votre mot de passe" required minLength={8} className="input-base pl-10" />
            </div>
          </div>

          {error && (
            <div className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Activer mon compte</>}
          </button>
        </form>

        <p className="text-center text-xs text-surface-400 mt-6">
          Lab Learning — Formation professionnelle certifiee Qualiopi
        </p>
      </div>
    </div>
  )
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </div>
    }>
      <SetupForm />
    </Suspense>
  )
}
