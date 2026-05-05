/**
 * Service de recherche d'entreprises via l'API publique data.gouv
 * Source: https://recherche-entreprises.api.gouv.fr/
 * Pas de clé API requise. Données INSEE/Sirene officielles.
 */

const API_URL = 'https://recherche-entreprises.api.gouv.fr/search'

export interface SireneCompany {
  siren: string
  siret: string
  raison_sociale: string
  sigle: string | null
  adresse: string
  code_postal: string
  ville: string
  code_naf: string
  libelle_naf: string | null  // Libellé du code NAF (= secteur d'activité)
  code_idcc: string | null    // Code IDCC de la convention collective (depuis siret_opco)
  taille_entreprise: 'TPE' | 'PME' | 'ETI' | 'GE' | ''
  effectif_libelle: string | null  // Ex: "10 à 19 salariés"
  forme_juridique: string | null   // Ex: "SAS", "SARL"
  date_creation: string | null     // YYYY-MM-DD
  tva_intra: string | null         // Ex: "FR12345678901"
  est_qualiopi: boolean
  est_organisme_formation: boolean
  est_actif: boolean
  dirigeant: { prenom: string; nom: string; qualite: string } | null
}

interface ApiResult {
  siren: string
  nom_complet: string
  nom_raison_sociale: string | null
  sigle: string | null
  categorie_entreprise: string | null
  nature_juridique: string | null
  date_creation: string | null
  etat_administratif: string
  complements?: { est_qualiopi?: boolean; est_organisme_formation?: boolean }
  dirigeants: Array<{ nom?: string; prenoms?: string; qualite?: string; type_dirigeant?: string }>
  siege: {
    siret: string
    activite_principale: string | null
    code_postal: string | null
    libelle_commune: string | null
    numero_voie: string | null
    type_voie: string | null
    libelle_voie: string | null
    complement_adresse: string | null
    tranche_effectif_salarie: string | null
    etat_administratif: string
  }
}

function buildAdresse(siege: ApiResult['siege']): string {
  const parts = [
    siege.numero_voie,
    siege.type_voie,
    siege.libelle_voie,
  ].filter(Boolean).join(' ').trim()
  return parts || ''
}

// Mapping complet des tranches d'effectif INSEE → catégorie + libellé
const EFFECTIF_MAP: Record<string, { taille: SireneCompany['taille_entreprise']; libelle: string }> = {
  '00': { taille: 'TPE', libelle: '0 salarié' },
  '01': { taille: 'TPE', libelle: '1 ou 2 salariés' },
  '02': { taille: 'TPE', libelle: '3 à 5 salariés' },
  '03': { taille: 'TPE', libelle: '6 à 9 salariés' },
  '11': { taille: 'PME', libelle: '10 à 19 salariés' },
  '12': { taille: 'PME', libelle: '20 à 49 salariés' },
  '21': { taille: 'PME', libelle: '50 à 99 salariés' },
  '22': { taille: 'PME', libelle: '100 à 199 salariés' },
  '31': { taille: 'PME', libelle: '200 à 249 salariés' },
  '32': { taille: 'ETI', libelle: '250 à 499 salariés' },
  '41': { taille: 'ETI', libelle: '500 à 999 salariés' },
  '42': { taille: 'ETI', libelle: '1 000 à 1 999 salariés' },
  '51': { taille: 'ETI', libelle: '2 000 à 4 999 salariés' },
  '52': { taille: 'GE', libelle: '5 000 à 9 999 salariés' },
  '53': { taille: 'GE', libelle: '10 000 salariés et plus' },
}

function mapTaille(categorie: string | null, effectif: string | null): SireneCompany['taille_entreprise'] {
  if (effectif && EFFECTIF_MAP[effectif]) return EFFECTIF_MAP[effectif].taille
  if (categorie === 'PME' || categorie === 'ETI' || categorie === 'GE') return categorie
  return ''
}

function mapEffectifLibelle(effectif: string | null): string | null {
  if (effectif && EFFECTIF_MAP[effectif]) return EFFECTIF_MAP[effectif].libelle
  return null
}

// Mapping des principaux codes nature juridique INSEE → libellé court
const NATURE_JURIDIQUE_MAP: Record<string, string> = {
  '1000': 'Entrepreneur individuel',
  '5202': 'SNC', '5203': 'SCS',
  '5306': 'SARL', '5485': 'SARL', '5499': 'SARL',
  '5505': 'SARL', '5510': 'SARL', '5515': 'SARL',
  '5710': 'SAS', '5720': 'SASU', '5785': 'SAS', '5800': 'SAS',
  '5410': 'SA', '5415': 'SA', '5420': 'SA', '5499': 'SA',
  '6533': 'SCI', '6532': 'SCI',
  '6540': 'Société civile professionnelle',
  '9220': 'Association loi 1901',
  '9210': 'Association',
  '9240': 'Fondation',
  '5610': 'EURL', '5615': 'EURL',
  '5260': 'Société coopérative',
  '5499': 'SA à directoire',
  '6100': 'Caisse de crédit municipal',
  '7220': 'Service de l\'Etat',
  '7321': 'Commune',
}

function mapFormeJuridique(code: string | null): string | null {
  if (!code) return null
  return NATURE_JURIDIQUE_MAP[code] || null
}

/** Calcule le numéro de TVA intra français à partir du SIREN */
function calcTvaIntra(siren: string): string | null {
  const clean = siren.replace(/\D/g, '')
  if (clean.length !== 9) return null
  const sirenNum = parseInt(clean, 10)
  const cle = (12 + 3 * (sirenNum % 97)) % 97
  return `FR${cle.toString().padStart(2, '0')}${clean}`
}

function mapResult(r: ApiResult): SireneCompany {
  const siege = r.siege || ({} as ApiResult['siege'])
  const firstDirigeant = r.dirigeants?.find(d => d.type_dirigeant === 'personne physique') || r.dirigeants?.[0]
  return {
    siren: r.siren,
    siret: siege.siret || '',
    raison_sociale: r.nom_raison_sociale || r.nom_complet || '',
    sigle: r.sigle || null,
    adresse: buildAdresse(siege),
    code_postal: siege.code_postal || '',
    ville: siege.libelle_commune || '',
    code_naf: siege.activite_principale || '',
    libelle_naf: null,  // Rempli côté serveur dans le proxy via lookup DB
    code_idcc: null,    // Idem
    taille_entreprise: mapTaille(r.categorie_entreprise, siege.tranche_effectif_salarie),
    effectif_libelle: mapEffectifLibelle(siege.tranche_effectif_salarie),
    forme_juridique: mapFormeJuridique(r.nature_juridique),
    date_creation: r.date_creation || null,
    tva_intra: calcTvaIntra(r.siren),
    est_qualiopi: r.complements?.est_qualiopi === true,
    est_organisme_formation: r.complements?.est_organisme_formation === true,
    est_actif: r.etat_administratif === 'A',
    dirigeant: firstDirigeant?.prenoms && firstDirigeant?.nom
      ? {
          prenom: firstDirigeant.prenoms.split(' ')[0],
          nom: firstDirigeant.nom,
          qualite: firstDirigeant.qualite || '',
        }
      : null,
  }
}

export async function searchCompanies(query: string, limit = 10): Promise<SireneCompany[]> {
  const q = query.trim()
  if (q.length < 2) return []

  // Côté browser : passer par notre proxy Vercel (réseau plus stable que celui du user)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams({ q, limit: String(limit) })
    const res = await fetch(`/api/sirene/search?${params}`)
    if (!res.ok) throw new Error('proxy error')
    const data = await res.json()
    return data.companies || []
  }

  // Côté serveur : appel direct à l'API publique
  const params = new URLSearchParams({
    q,
    page: '1',
    per_page: String(Math.min(limit, 25)),
    etat_administratif: 'A',
  })
  const res = await fetch(`${API_URL}?${params}`, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data.results)) return []
  return data.results.map(mapResult)
}

export async function getCompanyBySiret(siret: string): Promise<SireneCompany | null> {
  const clean = siret.replace(/\D/g, '')
  if (clean.length !== 14) return null
  const params = new URLSearchParams({ q: clean, page: '1', per_page: '1' })
  const res = await fetch(`${API_URL}?${params}`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data.results) || data.results.length === 0) return null
  return mapResult(data.results[0])
}
