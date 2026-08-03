export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <>
      <section className="max-w-3xl mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-4">
        <span className="ll-kicker">Informations légales</span>
        <h1 className="mt-4 ll-display ll-fluid-h1 text-[#14110F] text-balance">{title}</h1>
        {updated && <p className="mt-3 text-sm text-[#A8A29E]">Dernière mise à jour : {updated}</p>}
      </section>
      <section className="max-w-3xl mx-auto px-5 md:px-8 pb-20">
        <div className="ll-legal">{children}</div>
      </section>
    </>
  )
}
