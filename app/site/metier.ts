import { ChefHat, Beef, Wheat, Cake, Croissant, Coffee, UtensilsCrossed, Sandwich, Wine, ShieldCheck } from './icons'

export interface MetierStyle {
  Icon: any
  from: string   // dégradé début
  to: string     // dégradé fin
  tint: string   // teinte de fond douce (card)
  ink: string    // couleur accent lisible
  img: string    // photo métier (public/site/metiers)
}

const IMG = (k: string) => `/site/metiers/${k}.webp`

/**
 * Identité visuelle par métier : une icône, un dégradé et une photo réelle,
 * qui servent d'« image » sur les cards. Aucun emoji.
 */
export function metierStyle(nom: string): MetierStyle {
  const n = (nom || '').toLowerCase()
  if (n.includes('bouch'))
    return { Icon: Beef, from: '#7F1D1D', to: '#B91C1C', tint: '#FEF2F2', ink: '#B91C1C', img: IMG('boucherie') }
  if (n.includes('boulanger') || n.includes('pain'))
    return { Icon: Wheat, from: '#92400E', to: '#D97706', tint: '#FFFBEB', ink: '#B45309', img: IMG('boulangerie') }
  if (n.includes('viennois') || n.includes('croissant'))
    return { Icon: Croissant, from: '#B45309', to: '#F59E0B', tint: '#FFFBEB', ink: '#B45309', img: IMG('boulangerie') }
  if (n.includes('patiss') || n.includes('pâtiss') || n.includes('dessert'))
    return { Icon: Cake, from: '#9D174D', to: '#DB2777', tint: '#FDF2F8', ink: '#BE185D', img: IMG('patisserie') }
  if (n.includes('rapid') || n.includes('snack') || n.includes('burger') || n.includes('fast'))
    return { Icon: Sandwich, from: '#9A3412', to: '#EA580C', tint: '#FFF7ED', ink: '#C2410C', img: IMG('rapide') }
  if (n.includes('hcr') || n.includes('hôtel') || n.includes('hotel') || n.includes('café') || n.includes('cafe') || n.includes('bar'))
    return { Icon: Coffee, from: '#1E3A8A', to: '#4338CA', tint: '#EEF2FF', ink: '#4338CA', img: IMG('hcr') }
  if (n.includes('vin') || n.includes('sommel') || n.includes('boisson'))
    return { Icon: Wine, from: '#581C87', to: '#7C3AED', tint: '#FAF5FF', ink: '#7C3AED', img: IMG('hcr') }
  if (n.includes('cuisin') || n.includes('chef') || n.includes('restaur'))
    return { Icon: ChefHat, from: '#134E4A', to: '#0F766E', tint: '#F0FDFA', ink: '#0F766E', img: IMG('cuisine') }
  if (n.includes('hygièn') || n.includes('hygien') || n.includes('haccp') || n.includes('sécur') || n.includes('secur'))
    return { Icon: ShieldCheck, from: '#14532D', to: '#16A34A', tint: '#F0FDF4', ink: '#15803D', img: IMG('cuisine') }
  return { Icon: UtensilsCrossed, from: '#195144', to: '#0F766E', tint: '#F0FDFA', ink: '#195144', img: IMG('cuisine') }
}
