import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 text-center px-6">
      <div className="text-[7rem] font-heading font-black text-surface-100 leading-none tracking-display">404</div>
      <h1 className="text-xl font-heading font-bold text-surface-900 tracking-heading mt-4 mb-2">
        Page introuvable
      </h1>
      <p className="text-surface-500 text-sm mb-8 max-w-md">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link href="/dashboard" className="btn-primary">
        Retour au tableau de bord
      </Link>
    </div>
  )
}
