import { AlertTriangle, Mail } from 'lucide-react'

interface AccountNotLinkedProps {
  roleName: string
  userName: string
}

export function AccountNotLinked({ roleName, userName }: AccountNotLinkedProps) {
  return (
    <div className="max-w-lg mx-auto py-16 text-center animate-fade-in">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-50 mb-6">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>
      <h1 className="text-xl font-heading font-bold text-surface-900 mb-2">
        Bienvenue, {userName}
      </h1>
      <p className="text-surface-500 text-sm leading-relaxed mb-6">
        Votre compte <strong className="text-surface-700">{roleName}</strong> est actif
        mais n'est pas encore rattaché à votre fiche dans le système.
        <br />
        Votre gestionnaire doit finaliser la configuration de votre accès.
      </p>
      <a
        href="mailto:digital@lab-learning.fr"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: '#195144' }}
      >
        <Mail className="h-4 w-4" />
        Contacter l'administrateur
      </a>
    </div>
  )
}
