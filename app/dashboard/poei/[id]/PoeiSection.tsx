import type { LucideIcon } from 'lucide-react'

/**
 * En-tête commun à tous les onglets du dossier POEI.
 *
 * Chaque onglet avait sa propre mise en page : titre en h3 ici, section-label
 * là, boutons tantôt à gauche tantôt à droite. Passer d'un onglet à l'autre
 * demandait de se réorienter à chaque fois.
 */
export function PoeiSection({
  icone: Icone, titre, sous, actions, children,
}: {
  icone: LucideIcon
  titre: string
  sous?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-base font-heading font-semibold text-surface-900 flex items-center gap-2">
            <Icone className="h-4.5 w-4.5 text-brand-500 shrink-0" />
            {titre}
          </h2>
          {sous && <p className="text-sm text-surface-500 mt-0.5">{sous}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

/** État vide uniforme : une icône, une phrase qui dit quoi faire. */
export function PoeiVide({ icone: Icone, texte }: { icone: LucideIcon; texte: string }) {
  return (
    <div className="card p-10 text-center">
      <Icone className="h-9 w-9 text-surface-300 mx-auto mb-3" />
      <p className="text-sm text-surface-500 max-w-sm mx-auto">{texte}</p>
    </div>
  )
}
