export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — editorial branding */}
      <div className="hidden lg:flex lg:w-[520px] xl:w-[600px] bg-surface-900 relative overflow-hidden flex-col justify-between p-14">
        {/* Background texture */}
        <div className="absolute inset-0 bg-noise opacity-40" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

        {/* Geometric accent shapes */}
        <div className="absolute top-[-10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-brand-600/8 blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-10%] w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute top-1/3 right-12 w-24 h-24 border border-white/[0.06] rounded-2xl rotate-12" />
        <div className="absolute bottom-1/4 left-16 w-16 h-16 border border-white/[0.04] rounded-xl -rotate-6" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <span className="text-lg font-heading font-bold text-white tracking-tight">FormaCRM</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-[2.5rem] xl:text-[3rem] font-heading font-black text-white leading-[1.1] tracking-display">
              Gérez vos<br />
              formations en<br />
              <span className="text-brand-400">toute conformité.</span>
            </h1>
            <p className="text-surface-400 text-lg leading-relaxed mt-6 max-w-sm">
              Le CRM pensé pour les organismes de formation certifiés Qualiopi. De la prospection au bilan.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-10">
            {[
              { value: '7', label: 'Critères' },
              { value: '32', label: 'Indicateurs' },
              { value: '100%', label: 'Digital' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-heading font-bold text-white tracking-tight">{stat.value}</div>
                <div className="text-sm text-surface-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-surface-600">
          {new Date().getFullYear()} FormaCRM
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  )
}
