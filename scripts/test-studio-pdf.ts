// Test visuel local du gabarit studio — usage: npx tsx scripts/test-studio-pdf.ts
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { writeFileSync } from 'fs'
import { DocumentBrandePDF } from '../lib/pdf/document-brande-pdf'

const etapes = (n: number) => Array.from({ length: n }, (_, i) => ({
  numero: i + 1, titre: `Étape ${i + 1} — opération de contrôle`,
  details: ['Vérifier : emballage intact, DLC, étiquetage', 'T° ambiante — stockage sec'],
  ccp: i % 2 ? 'Contrôle visuel + bon de livraison' : null,
}))
const doc = {
  titre: 'Organigramme du Riz & des Sauces',
  sous_titre: 'Diagramme de flux HACCP',
  etiquettes: ['HACCP', 'Riz', 'Sauces'],
  sections: [
    { titre: 'Filière Riz', icone: 'reception', ton: 'normal' as const, etapes: etapes(5) },
    { titre: 'Filière Tenders', icone: 'froid', ton: 'normal' as const, etapes: etapes(5) },
    { titre: 'Réception, stockage et conservation', icone: 'stockage', ton: 'critique' as const, etapes: etapes(4) },
    { titre: 'Sauces', icone: 'produit', colonnes: ['Étape', 'Détails'], lignes: [['Réception', 'Emballage intact'], ['Stockage', 'FIFO']] },
    { titre: 'Rappels CCP', icone: 'controle', ton: 'attention' as const, items: ['Toujours dater le contenant', 'Ne jamais reverser un reste'] },
  ],
}
async function main() {
  const buf = await renderToBuffer(createElement(DocumentBrandePDF, {
    doc, franchiseNom: 'Chamas Tacos', logoUrl: null, couleur: '#EFC03E', couleur2: '#0B0C0E',
    formateurNom: 'Brahim Hachani', dateStr: '25 août 2026', labLogoUrl: null, paysage: true,
  } as any) as any)
  writeFileSync('/tmp/test-studio.pdf', buf)
  const buf2 = await renderToBuffer(createElement(DocumentBrandePDF, {
    doc, franchiseNom: 'Chicken Street', logoUrl: null, couleur: '#141414', couleur2: null,
    formateurNom: 'Brahim Hachani', dateStr: '25 août 2026', labLogoUrl: null, paysage: false,
  } as any) as any)
  writeFileSync('/tmp/test-studio-sombre.pdf', buf2)
  console.log('PDF écrits', buf.length, buf2.length)
}
main()
