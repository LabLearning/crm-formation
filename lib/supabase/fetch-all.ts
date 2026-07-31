/**
 * Récupère TOUTES les lignes d'une requête Supabase en paginant par lots de 1000.
 *
 * PostgREST plafonne une requête à 1000 lignes par défaut. Toute logique qui
 * suppose avoir l'ensemble complet (dédup, contrôle d'existence, comptage via
 * `.length`, agrégation reduce/somme, export) devient FAUSSE dès que la table
 * (scopée) dépasse 1000 lignes. Utiliser ce helper pour ces cas.
 *
 * `build(from, to)` doit renvoyer une requête Supabase incluant `.range(from, to)`.
 *
 * Exemple :
 *   const rows = await fetchAllPaged((from, to) =>
 *     supabase.from('qcm_reponses').select('id, score').eq('organization_id', org).range(from, to))
 */
export async function fetchAllPaged<T = any>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error || !data || data.length === 0) break
    out.push(...data)
    if (data.length < pageSize) break
  }
  return out
}
