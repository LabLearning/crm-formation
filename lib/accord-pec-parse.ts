/**
 * Lecture d'un accord de prise en charge OPCO.
 *
 * L'accord arrive en PDF depuis le portail de l'OPCO. Y retaper le numéro de
 * dossier, le montant et la date est à la fois pénible et fautif : un chiffre
 * mal recopié et l'OPCO rejette la facture. On lit donc le document.
 *
 * Particularité qui commande toute la suite : l'extraction de texte des PDF
 * AKTO ne restitue aucune espace — « Numérodedossier:2607AF005877 ». Les
 * motifs travaillent donc sur un texte normalisé, espaces retirées et accents
 * dépouillés, et non sur le texte brut.
 *
 * Trois réserves assumées :
 *   * un accord scanné n'a pas de couche texte — rien n'est extractible, et
 *     c'est dit plutôt que deviné ;
 *   * les gabarits varient d'un OPCO à l'autre, donc chaque champ peut
 *     manquer indépendamment des autres ;
 *   * ce qui est lu ne remplace jamais une valeur déjà saisie.
 */

export interface AccordLu {
  texteTrouve: boolean
  numero_dossier: string | null
  montant: number | null
  date: string | null
}

/** Extrait le texte d'un PDF. Renvoie '' si le document n'a pas de couche texte. */
async function texteDuPdf(buffer: Buffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const doc = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(doc, { mergePages: true })
    return typeof text === 'string' ? text : (text as string[]).join('\n')
  } catch (e) {
    console.error('[accord pec — lecture pdf]', e)
    return ''
  }
}

/**
 * Texte comparable : sans espaces ni accents.
 *
 * La casse est conservée : sans espaces, c'est le seul indice qui marque la
 * fin d'une référence et le début du libellé suivant
 * (« 2607AF005877Typededossier »).
 */
function normaliser(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '')
}

/**
 * Numéro de dossier.
 *
 * L'intitulé qui précède le numéro est le repère le plus sûr. À défaut, le
 * format AKTO — 2607AF005877 : année, mois, « AF », séquence — se reconnaît
 * seul.
 */
function lireNumeroDossier(n: string): string | null {
  // Format AKTO — 2607AF005877 : année, mois, « AF », séquence. Sans ambiguïté
  // de bornes, c'est la lecture la plus sûre.
  const akto = n.match(/(\d{4}AF\d{5,7})/i)
  if (akto) return akto[1].toUpperCase()

  // Sinon, on part du libellé. Repérer le libellé et capturer la référence
  // sont deux opérations distinctes : le libellé se cherche sans égard à la
  // casse, la référence exige des majuscules — c'est ce qui la distingue du
  // texte courant maintenant que les espaces ont disparu.
  const libelle = /(?:numerodedossier|numerodudossier|ndossier|dossiern[°o]?|referencedossier|priseenchargen[°o])/i
  const trouve = libelle.exec(n)
  if (!trouve) return null

  const reste = n.slice(trouve.index + trouve[0].length).replace(/^[:\-.]+/, '')
  // Ancré : la référence suit immédiatement le libellé, et s'arrête au premier
  // mot qui recommence — une majuscule suivie de minuscules.
  const ref = reste.match(/^([A-Z0-9][A-Z0-9\-/_.]{4,23}?)(?=[A-Z][a-z]{2,}|$)/)
  return ref ? ref[1].replace(/[.,;\-/_]+$/, '').toUpperCase() : null
}

/** « 2625,00 » → 2625 ; « 1.050,50 » → 1050.5 */
function nombre(brut: string): number | null {
  const net = brut
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const v = Number(net)
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * Montant pris en charge.
 *
 * Un accord porte plusieurs montants — frais pédagogiques, frais annexes,
 * plafonds. Celui qui compte est le total hors taxes, ou à défaut celui
 * qualifié de « pris en charge ». Le repli sur le montant le plus élevé du
 * document n'est pas arbitraire : sur un accord, c'est le total.
 */
function lireMontant(n: string): number | null {
  const qualifies = [
    /totalht\*?[:\-]?([\d.,]+)/i,
    /montanttotaldelapriseencharge[:\-]?([\d.,]+)/i,
    /montant(?:total)?prisencharge[:\-]?([\d.,]+)/i,
    /montantaccorde[:\-]?([\d.,]+)/i,
    /montantfinance[:\-]?([\d.,]+)/i,
  ]
  for (const re of qualifies) {
    const m = n.match(re)
    if (m) { const v = nombre(m[1]); if (v) return v }
  }

  const tous = [...n.matchAll(/([\d][\d.,]{1,13})(?:€|EUR\b)/gi)]
    .map((m) => nombre(m[1]))
    .filter((v): v is number => v !== null)
  return tous.length ? Math.max(...tous) : null
}

const MOIS: Record<string, string> = {
  janvier: '01', fevrier: '02', mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', aout: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12',
}

/**
 * Date de l'accord.
 *
 * Elle ne se devine pas : un accord porte aussi les dates de la formation, et
 * prendre « la première date du document » donnerait le début de session. On
 * n'accepte donc qu'une date explicitement introduite — « PARIS, le 10 août
 * 2026 », « Date de la décision : … » — et rien sinon.
 */
function lireDate(n: string): string | null {
  const iso = (j: string, m: string, a: string) =>
    `${a.length === 2 ? `20${a}` : a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`

  const lettres = n.match(/,le(\d{1,2})([a-z]+)(\d{4})/i)
  if (lettres && MOIS[lettres[2].toLowerCase()]) return iso(lettres[1], MOIS[lettres[2].toLowerCase()], lettres[3])

  const qualifiee = n.match(
    /(?:datedel'?accord|datedelaccord|datedeladecision|datedenotification|accordele|decisiondu|emisle|faitle)[:\-]?(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/i,
  )
  if (qualifiee) return iso(qualifiee[1], qualifiee[2], qualifiee[3])

  const qualifieeLettres = n.match(
    /(?:datedel'?accord|datedelaccord|datedeladecision|accordele|faitle)[:\-]?(\d{1,2})([a-z]+)(\d{4})/i,
  )
  const moisLettres = qualifieeLettres ? MOIS[qualifieeLettres[2].toLowerCase()] : null
  if (qualifieeLettres && moisLettres) {
    return iso(qualifieeLettres[1], moisLettres, qualifieeLettres[3])
  }

  return null
}

/** Lit un accord de prise en charge. Aucun champ n'est garanti. */
export async function lireAccordPec(buffer: Buffer, mimeType?: string | null): Promise<AccordLu> {
  const vide: AccordLu = { texteTrouve: false, numero_dossier: null, montant: null, date: null }
  if (mimeType && !mimeType.includes('pdf')) return vide

  const brut = await texteDuPdf(buffer)
  const n = normaliser(brut)
  // Un scan renvoie quelques caractères parasites, pas un document.
  if (n.length < 40) return vide

  return {
    texteTrouve: true,
    numero_dossier: lireNumeroDossier(n),
    montant: lireMontant(n),
    date: lireDate(n),
  }
}
