import { Sandwich, ChefHat, Beef, Wheat } from './icons'
import { BRANCHES_BASE } from '@/lib/branches'

// Habillage visuel par branche (image + icône + dégradé). La logique métier
// (classification, groupes) est dans lib/branches.ts (partagée avec le CRM).
const VISUAL: Record<string, { img: string; Icon: any; from: string; to: string }> = {
  'restauration-rapide': { img: 'rapide', Icon: Sandwich, from: '#9A3412', to: '#EA580C' },
  'restaurant-hcr': { img: 'cuisine', Icon: ChefHat, from: '#134E4A', to: '#0F766E' },
  'boucherie-charcuterie': { img: 'boucherie', Icon: Beef, from: '#7F1D1D', to: '#B91C1C' },
  'boulangerie-patisserie': { img: 'boulangerie', Icon: Wheat, from: '#92400E', to: '#D97706' },
}

export interface Branche { slug: string; label: string; tagline: string; img: string; Icon: any; from: string; to: string }

export const BRANCHES: Branche[] = BRANCHES_BASE.map((b) => ({ ...b, ...VISUAL[b.slug] }))
export const brancheBySlug = (slug: string) => BRANCHES.find((b) => b.slug === slug)
