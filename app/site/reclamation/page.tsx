import { ReclamationForm } from './ReclamationForm'

export const metadata = {
  title: 'Déposer une réclamation',
  description:
    'Le canal officiel pour signaler une difficulté ou une insatisfaction sur une formation Lab Learning : chaque réclamation est enregistrée, traitée et suivie.',
  alternates: { canonical: '/reclamation' },
}

/**
 * Dépôt public d'une réclamation (indicateur 31 du RNQ) : stagiaires,
 * entreprises et financeurs doivent pouvoir exprimer une réclamation sans
 * compte ni intermédiaire. Elle entre dans le registre du CRM et suit le
 * circuit de traitement habituel.
 */
export default function ReclamationPage() {
  return (
    <>
      <section className="max-w-3xl mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-4">
        <span className="ll-kicker">Qualité</span>
        <h1 className="mt-4 ll-display ll-fluid-h1 text-[#14110F] text-balance">Déposer une réclamation</h1>
        <p className="mt-4 text-[#57534E] leading-relaxed max-w-xl">
          Une formation ne s&apos;est pas déroulée comme prévu ? Dites-le-nous. Chaque réclamation est
          enregistrée, analysée et suivie dans le cadre de notre démarche qualité : vous recevez un
          accusé de réception immédiat, puis une réponse sur les suites données.
        </p>
      </section>
      <section className="max-w-3xl mx-auto px-5 md:px-8 pb-20 pt-6">
        <ReclamationForm />
      </section>
    </>
  )
}
