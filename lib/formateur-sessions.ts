/**
 * Sessions listées dans l'espace formateur.
 *
 * Le statut d'une session bascule automatiquement en `terminee` dès le
 * lendemain de sa date de fin (cron `statuts-sessions`). Les listes ne
 * peuvent donc pas se limiter aux sessions actives : le formateur a encore
 * besoin d'y accéder après coup pour finaliser un émargement, projeter
 * l'évaluation des acquis ou la satisfaction à chaud, et relancer la
 * satisfaction à froid à J+30 / J+90.
 */

/** Statuts d'une session encore à venir ou en cours. */
export const STATUTS_ACTIFS = ['planifiee', 'confirmee', 'en_attente_signatures', 'validee', 'en_cours']

/** Fenêtre par défaut, en jours, pendant laquelle une session terminée reste listée. */
export const JOURS_APRES_FIN = 120

const ilYA = (jours: number) => {
  const d = new Date()
  d.setDate(d.getDate() - jours)
  return d.toISOString().slice(0, 10)
}

/**
 * Sessions d'un formateur : toutes les actives, plus les terminées dont la
 * fin remonte à moins de `jours`. Les annulées ne sont jamais listées.
 */
export async function sessionsFormateur(
  supabase: any,
  formateurId: string,
  select: string,
  jours = JOURS_APRES_FIN,
) {
  const { data, error } = await supabase
    .from('sessions')
    .select(select)
    .eq('formateur_id', formateurId)
    .neq('status', 'annulee')
    .or(`status.in.(${STATUTS_ACTIFS.join(',')}),and(status.eq.terminee,date_fin.gte.${ilYA(jours)})`)
    .order('date_debut', { ascending: true })

  if (error) {
    console.error('[sessionsFormateur]', error.message)
    return []
  }
  return (data || []) as any[]
}
