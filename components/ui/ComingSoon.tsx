import { Construction } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description?: string
  moduleName?: string
}

export function ComingSoon({ title, description, moduleName }: ComingSoonProps) {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">{title}</h1>
        {description && <p className="text-surface-500 mt-1 text-sm">{description}</p>}
      </div>

      <div className="card p-16 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-2xl bg-surface-100 flex items-center justify-center mb-5">
          <Construction className="h-6 w-6 text-surface-400" />
        </div>
        <h2 className="text-base font-heading font-semibold text-surface-800 mb-2">
          Module en construction
        </h2>
        <p className="text-sm text-surface-500 max-w-md">
          {moduleName
            ? `Le module « ${moduleName} » est en cours de développement et sera disponible prochainement.`
            : 'Ce module est en cours de développement et sera disponible prochainement.'}
        </p>
      </div>
    </div>
  )
}
