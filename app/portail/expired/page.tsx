import { ShieldAlert } from 'lucide-react'

export default function PortalExpiredPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 text-center px-6">
      <div className="h-14 w-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-6">
        <ShieldAlert className="h-7 w-7 text-surface-400" />
      </div>
      <h1 className="text-xl font-heading font-bold text-surface-900 tracking-heading mb-2">
        Lien invalide ou expiré
      </h1>
      <p className="text-sm text-surface-500 mb-6 max-w-md">
        Ce lien d&apos;accès à votre espace personnel n&apos;est plus valide.
        Il a peut-être expiré ou été révoqué.
      </p>
      <p className="text-xs text-surface-400">
        Contactez votre organisme de formation pour obtenir un nouveau lien d&apos;accès.
      </p>
    </div>
  )
}
