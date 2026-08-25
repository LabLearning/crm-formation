import * as React from 'react'
import { Svg, Path, Circle, Line } from '@react-pdf/renderer'

/**
 * Icônes vectorielles pour les PDF du studio — tracés inspirés de Lucide
 * (trait 2, bouts ronds), rendus nativement par react-pdf. L'IA choisit
 * l'icône par section via son nom métier.
 */
type Primitive = { p?: string; c?: [number, number, number]; l?: [number, number, number, number] }

const ICONES: Record<string, Primitive[]> = {
  temperature: [{ p: 'M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z' }],
  controle: [{ p: 'M20 6 9 17l-5-5' }],
  alerte: [{ p: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z' }, { l: [12, 9, 12, 13] }, { c: [12, 17, 0.6] }],
  cuisson: [{ p: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' }],
  froid: [{ l: [12, 2, 12, 22] }, { l: [2, 12, 22, 12] }, { l: [5, 5, 19, 19] }, { l: [19, 5, 5, 19] }],
  temps: [{ c: [12, 12, 10] }, { p: 'M12 6v6l4 2' }],
  nettoyage: [{ p: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z' }],
  securite: [{ p: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }],
  stockage: [{ p: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' }, { p: 'm3.3 7 8.7 5 8.7-5' }, { l: [12, 22, 12, 12] }],
  produit: [{ p: 'M2 3h20v6H2z' }, { p: 'M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9' }, { l: [10, 13, 14, 13] }],
  personnel: [{ p: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }, { c: [9, 7, 4] }, { p: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
  document: [{ p: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' }, { p: 'M14 2v5h5' }, { l: [8, 13, 16, 13] }, { l: [8, 17, 13, 17] }],
  reception: [{ p: 'M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0' }, { p: 'm16 19 2 2 4-4' }],
  service: [{ p: 'M3 11h18' }, { p: 'M12 3a9 9 0 0 1 9 8H3a9 9 0 0 1 9-8z' }, { l: [12, 3, 12, 1.5] }],
}

export function IconePdf({ nom, taille = 12, couleur = '#FFFFFF' }: { nom?: string | null; taille?: number; couleur?: string }) {
  const prims = ICONES[(nom || '').toLowerCase()] || ICONES.document
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      {prims.map((pr, i) => pr.p ? (
        <Path key={i} d={pr.p} stroke={couleur} strokeWidth={2} fill="none" strokeLineCap="round" strokeLineJoin="round" />
      ) : pr.c ? (
        <Circle key={i} cx={pr.c[0]} cy={pr.c[1]} r={pr.c[2]} stroke={couleur} strokeWidth={2} fill={pr.c[2] < 1 ? couleur : 'none'} />
      ) : pr.l ? (
        <Line key={i} x1={pr.l[0]} y1={pr.l[1]} x2={pr.l[2]} y2={pr.l[3]} stroke={couleur} strokeWidth={2} strokeLineCap="round" />
      ) : null)}
    </Svg>
  )
}

export const NOMS_ICONES = Object.keys(ICONES)
