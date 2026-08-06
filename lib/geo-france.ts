/**
 * Localisation approximative d'une session en France.
 *
 * L'ancienne carte géocodait le champ libre `lieu` : seules 2 % des sessions
 * étaient placées. On s'appuie désormais sur les colonnes structurées
 * `code_postal` et `ville`, renseignées sur la grande majorité des sessions.
 */

/** Centroïde de chaque département métropolitain (+ Corse). */
export const DEPARTEMENTS: Record<string, [number, number]> = {
  '01': [46.10, 5.35], '02': [49.56, 3.55], '03': [46.39, 3.19], '04': [44.10, 6.24],
  '05': [44.66, 6.30], '06': [43.94, 7.14], '07': [44.75, 4.42], '08': [49.61, 4.64],
  '09': [42.94, 1.51], '10': [48.31, 4.19], '11': [43.12, 2.40], '12': [44.31, 2.62],
  '13': [43.54, 5.10], '14': [49.10, -0.34], '15': [45.05, 2.63], '16': [45.72, 0.20],
  '17': [45.75, -0.72], '18': [47.06, 2.49], '19': [45.35, 1.87], '2A': [41.87, 8.95],
  '2B': [42.40, 9.20], '21': [47.35, 4.80], '22': [48.42, -2.86], '23': [46.09, 2.02],
  '24': [45.10, 0.72], '25': [47.16, 6.36], '26': [44.68, 5.17], '27': [49.13, 1.05],
  '28': [48.35, 1.32], '29': [48.25, -4.10], '30': [43.99, 4.20], '31': [43.42, 1.22],
  '32': [43.70, 0.44], '33': [44.78, -0.42], '34': [43.63, 3.42], '35': [48.18, -1.60],
  '36': [46.79, 1.57], '37': [47.25, 0.69], '38': [45.27, 5.62], '39': [46.72, 5.73],
  '40': [43.98, -0.75], '41': [47.62, 1.36], '42': [45.66, 4.19], '43': [45.13, 3.80],
  '44': [47.35, -1.72], '45': [47.90, 2.30], '46': [44.62, 1.60], '47': [44.36, 0.47],
  '48': [44.53, 3.50], '49': [47.39, -0.55], '50': [49.10, -1.28], '51': [48.95, 4.28],
  '52': [48.10, 5.20], '53': [48.15, -0.68], '54': [48.70, 6.16], '55': [48.98, 5.40],
  '56': [47.83, -2.83], '57': [49.03, 6.66], '58': [47.12, 3.50], '59': [50.45, 3.24],
  '60': [49.42, 2.42], '61': [48.63, 0.12], '62': [50.50, 2.30], '63': [45.72, 3.14],
  '64': [43.30, -0.76], '65': [43.06, 0.15], '66': [42.65, 2.55], '67': [48.63, 7.55],
  '68': [47.87, 7.27], '69': [45.76, 4.62], '70': [47.63, 6.14], '71': [46.65, 4.55],
  '72': [48.02, 0.20], '73': [45.50, 6.43], '74': [46.05, 6.44], '75': [48.86, 2.35],
  '76': [49.61, 1.01], '77': [48.63, 3.00], '78': [48.83, 1.86], '79': [46.55, -0.30],
  '80': [49.95, 2.28], '81': [43.79, 2.15], '82': [44.05, 1.30], '83': [43.42, 6.20],
  '84': [43.98, 5.16], '85': [46.68, -1.28], '86': [46.60, 0.42], '87': [45.87, 1.24],
  '88': [48.20, 6.40], '89': [47.80, 3.60], '90': [47.63, 6.90], '91': [48.52, 2.24],
  '92': [48.83, 2.24], '93': [48.92, 2.48], '94': [48.78, 2.47], '95': [49.08, 2.13],
}

/** Coordonnées exactes des villes les plus fréquentes (précision fine). */
export const VILLES: Record<string, [number, number]> = {
  'paris': [48.8566, 2.3522], 'lyon': [45.7640, 4.8357], 'marseille': [43.2965, 5.3698],
  'toulouse': [43.6047, 1.4442], 'nice': [43.7102, 7.2620], 'nantes': [47.2184, -1.5536],
  'strasbourg': [48.5734, 7.7521], 'montpellier': [43.6108, 3.8767], 'bordeaux': [44.8378, -0.5792],
  'lille': [50.6292, 3.0573], 'rennes': [48.1173, -1.6778], 'reims': [49.2583, 4.0317],
  'le havre': [49.4944, 0.1079], 'toulon': [43.1242, 5.9280], 'grenoble': [45.1885, 5.7245],
  'dijon': [47.3220, 5.0415], 'angers': [47.4784, -0.5632], 'nimes': [43.8367, 4.3601],
  'nîmes': [43.8367, 4.3601], 'clermont-ferrand': [45.7772, 3.0870], 'brest': [48.3904, -4.4861],
  'tours': [47.3941, 0.6848], 'amiens': [49.8941, 2.3025], 'limoges': [45.8336, 1.2611],
  'metz': [49.1193, 6.1757], 'perpignan': [42.6887, 2.8948], 'besancon': [47.2378, 6.0241],
  'besançon': [47.2378, 6.0241], 'orleans': [47.9029, 1.9092], 'orléans': [47.9029, 1.9092],
  'rouen': [49.4432, 1.0999], 'mulhouse': [47.7508, 7.3359], 'caen': [49.1829, -0.3707],
  'nancy': [48.6921, 6.1844], 'avignon': [43.9493, 4.8055], 'agde': [43.3108, 3.4758],
  'cap d\'agde': [43.2833, 3.5083], 'sete': [43.4033, 3.6975], 'sète': [43.4033, 3.6975],
  'beziers': [43.3442, 3.2158], 'béziers': [43.3442, 3.2158], 'narbonne': [43.1836, 3.0036],
  'carcassonne': [43.2130, 2.3491], 'evry': [48.6238, 2.4295], 'malakoff': [48.8189, 2.2986],
  'creil': [49.2583, 2.4833], 'muret': [43.4613, 1.3272], 'villefranche-sur-saone': [45.9847, 4.7197],
  'saint-etienne': [45.4397, 4.3872], 'saint-étienne': [45.4397, 4.3872], 'audincourt': [47.4819, 6.8397],
  'chambery': [45.5646, 5.9178], 'annecy': [45.8992, 6.1294], 'colmar': [48.0794, 7.3585],
  'angouleme': [45.6484, 0.1563], 'angoulême': [45.6484, 0.1563], 'valence': [44.9334, 4.8924],
}

const norm = (s: string) =>
  String(s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Position d'une session : ville exacte si connue, sinon centroïde du
 * département déduit du code postal, sinon extraction depuis le lieu libre.
 * `precise` indique si le point est à la ville (true) ou au département.
 */
export function localiserSession(s: {
  ville?: string | null
  code_postal?: string | null
  lieu?: string | null
}): { lat: number; lng: number; precise: boolean } | null {
  // 1) Ville exacte
  if (s.ville) {
    const v = norm(s.ville)
    if (VILLES[v]) return { lat: VILLES[v][0], lng: VILLES[v][1], precise: true }
    for (const [nom, c] of Object.entries(VILLES)) {
      if (v.includes(norm(nom)) || norm(nom).includes(v)) return { lat: c[0], lng: c[1], precise: true }
    }
  }
  // 2) Département via le code postal
  const cp = String(s.code_postal || '').replace(/\D/g, '')
  if (cp.length >= 2) {
    const dep = cp.slice(0, 2)
    if (DEPARTEMENTS[dep]) return { lat: DEPARTEMENTS[dep][0], lng: DEPARTEMENTS[dep][1], precise: false }
  }
  // 3) Repli : code postal ou ville trouvés dans le champ libre
  if (s.lieu) {
    const l = norm(s.lieu)
    const cpFound = l.match(/\b(\d{5})\b/)
    if (cpFound) {
      const dep = cpFound[1].slice(0, 2)
      if (DEPARTEMENTS[dep]) return { lat: DEPARTEMENTS[dep][0], lng: DEPARTEMENTS[dep][1], precise: false }
    }
    for (const [nom, c] of Object.entries(VILLES)) {
      if (l.includes(norm(nom))) return { lat: c[0], lng: c[1], precise: true }
    }
  }
  return null
}

export type Temporalite = 'passee' | 'en_cours' | 'a_venir'

/** Temporalité d'une session d'après ses seules dates. */
export function temporalite(dateDebut: string, dateFin?: string | null, today = new Date().toISOString().slice(0, 10)): Temporalite {
  const fin = (dateFin || dateDebut).slice(0, 10)
  const debut = dateDebut.slice(0, 10)
  if (fin < today) return 'passee'
  if (debut > today) return 'a_venir'
  return 'en_cours'
}

export const TEMPO_META: Record<Temporalite, { label: string; color: string; bg: string; text: string }> = {
  en_cours: { label: 'En cours', color: '#16a34a', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  a_venir: { label: 'À venir', color: '#2563eb', bg: 'bg-blue-50', text: 'text-blue-700' },
  passee: { label: 'Passée', color: '#a8a29e', bg: 'bg-surface-100', text: 'text-surface-600' },
}
