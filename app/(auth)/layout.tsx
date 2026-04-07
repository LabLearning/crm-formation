export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — Lab Learning */}
      <div className="hidden lg:flex lg:w-[520px] xl:w-[600px] relative overflow-hidden flex-col justify-between p-14" style={{ backgroundColor: '#195245' }}>
        {/* Background texture */}
        <div className="absolute inset-0 bg-noise opacity-40" />

        {/* Geometric accent shapes */}
        <div className="absolute top-[-10%] right-[-15%] w-[500px] h-[500px] rounded-full blur-3xl" style={{ backgroundColor: 'rgba(107,194,145,0.08)' }} />
        <div className="absolute bottom-[-5%] left-[-10%] w-[400px] h-[400px] rounded-full blur-3xl" style={{ backgroundColor: 'rgba(107,194,145,0.05)' }} />
        <div className="absolute top-1/3 right-12 w-24 h-24 border border-white/[0.06] rounded-2xl rotate-12" />
        <div className="absolute bottom-1/4 left-16 w-16 h-16 border border-white/[0.04] rounded-xl -rotate-6" />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/logo-lablearning.svg" alt="Lab Learning" className="h-10 brightness-0 invert" />
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-[2.5rem] xl:text-[3rem] font-heading font-black text-white leading-[1.1] tracking-display">
              Votre espace<br />
              <span style={{ color: '#6BC291' }}>Lab Learning</span>
            </h1>
            <p className="text-lg leading-relaxed mt-6 max-w-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Plateforme de gestion interne — formations, sessions, apprenants, conformité Qualiopi.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-10">
            {[
              { value: '5', label: 'Secteurs' },
              { value: '67+', label: 'Formations' },
              { value: 'Qualiopi', label: 'Certifié' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-heading font-bold text-white tracking-tight">{stat.value}</div>
                <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Secteurs */}
          <div className="flex flex-wrap gap-2">
            {['Restauration', 'Boucherie', 'Boulangerie', 'Pâtisserie', 'Hôtellerie'].map(s => (
              <span key={s} className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(107,194,145,0.15)', color: '#6BC291' }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {new Date().getFullYear()} Lab Learning — Organisme de formation professionnelle certifié Qualiopi
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
