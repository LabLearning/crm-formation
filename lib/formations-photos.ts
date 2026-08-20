import photosIds from './formations-photos.json'

const PHOTOS = new Set<string>(photosIds as string[])

/** Photo dédiée de la formation si elle a été générée, sinon null
 *  (l'appelant retombe sur la photo de thème métier). */
export function photoFormation(id: string | null | undefined): string | null {
  if (!id || !PHOTOS.has(id)) return null
  return `/site/formations/${id}.webp`
}
