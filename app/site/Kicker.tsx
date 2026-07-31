/**
 * Eyebrow / kicker éditorial : petit label en capitales précédé d'un trait.
 * `tone`: 'brand' (vert) ou 'light' (sur fond sombre). `center` ajoute un trait de chaque côté.
 */
export function Kicker({
  children, tone = 'brand', center = false, className = '',
}: { children: React.ReactNode; tone?: 'brand' | 'light'; center?: boolean; className?: string }) {
  return (
    <span className={`ll-kicker ${tone === 'light' ? 'll-kicker--light' : ''} ${center ? 'll-kicker--center' : ''} ${className}`}>
      {children}
    </span>
  )
}
