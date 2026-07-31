'use client'

// Transition d'entrée à chaque navigation entre pages du site (fade + montée).
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="ll-page-enter">{children}</div>
}
