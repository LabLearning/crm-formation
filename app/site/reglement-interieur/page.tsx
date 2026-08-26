import { LegalPage } from '../LegalPage'
import { RI_BLOCS, RI_VERSION } from './contenu'

export const metadata = { title: 'Règlement intérieur — Lab Learning' }

/**
 * Règlement intérieur applicable aux stagiaires (articles L6352-3 à L6352-5 et
 * R6352-1 à R6352-15 du code du travail).
 *
 * Publié sur le site : la remise au stagiaire suppose que le document soit
 * accessible avant l'entrée en formation, et l'indicateur 9 du RNQ contrôle
 * précisément cette diffusion. Le contenu vit dans ./contenu.ts — la même
 * source alimente le PDF téléchargeable (/api/pdf/reglement-interieur).
 */
export default function ReglementInterieur() {
  return (
    <LegalPage title="Règlement intérieur applicable aux stagiaires" updated="août 2026">
      <p>
        <a
          href="/api/pdf/reglement-interieur"
          target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 999, background: '#205040', color: '#fff', fontWeight: 600, textDecoration: 'none' }}
        >
          Télécharger le règlement intérieur (PDF)
        </a>
      </p>
      <p><em>{RI_VERSION}</em></p>
      {RI_BLOCS.map((b, i) => {
        if (b.t === 'h') return <h2 key={i}>{b.v}</h2>
        if (b.t === 'ul') return (
          <ul key={i}>
            {b.v.map((li, j) => <li key={j}>{li}</li>)}
          </ul>
        )
        return <p key={i}>{b.v}</p>
      })}
    </LegalPage>
  )
}
