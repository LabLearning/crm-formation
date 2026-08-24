import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Fiche entreprise publique par SIRET, pour le simulateur de prise en charge :
 * proxy de recherche-entreprises.api.gouv.fr (données publiques, sans clé)
 * avec suggestion de branche d'après le code NAF. Aucune donnée privée.
 */
const BRANCHE_PAR_NAF: Array<[RegExp, string]> = [
  [/^56\.?10C/, 'restauration-rapide'],
  [/^56\.?10[AB]/, 'restaurant-hcr'],
  [/^56\.?30/, 'restaurant-hcr'],
  [/^55\.?10/, 'restaurant-hcr'],
  [/^47\.?22/, 'boucherie-charcuterie'],
  [/^10\.?13/, 'boucherie-charcuterie'],
  [/^10\.?7[12]/, 'boulangerie-patisserie'],
  [/^47\.?24/, 'boulangerie-patisserie'],
]

export async function GET(req: Request) {
  const siret = (new URL(req.url).searchParams.get('siret') || '').replace(/\s/g, '')
  if (!/^\d{9}(\d{5})?$/.test(siret)) {
    return NextResponse.json({ error: 'SIRET invalide — 14 chiffres attendus' }, { status: 400 })
  }

  try {
    const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=1`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!r.ok) throw new Error(`api.gouv ${r.status}`)
    const data = await r.json()
    const e = data?.results?.[0]
    if (!e) return NextResponse.json({ error: 'Entreprise introuvable pour ce SIRET' }, { status: 404 })

    const naf: string = e.siege?.activite_principale || e.activite_principale || ''
    const branche = BRANCHE_PAR_NAF.find(([re]) => re.test(naf))?.[1] || null

    return NextResponse.json({
      nom: e.nom_complet || e.nom_raison_sociale,
      siren: e.siren,
      naf,
      libelleNaf: e.libelle_activite_principale || null,
      adresse: e.siege?.adresse || null,
      brancheSuggeree: branche,
    })
  } catch (err) {
    console.error('[entreprise publique]', err)
    return NextResponse.json({ error: 'Recherche indisponible — vous pouvez continuer sans SIRET' }, { status: 502 })
  }
}
