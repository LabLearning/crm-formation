/**
 * Règles de facturation communes.
 *
 * Ces valeurs ne peuvent pas vivre dans un fichier `'use server'` : Next n'y
 * autorise que l'export de fonctions asynchrones.
 */

/** Délai de règlement standard Lab Learning, appliqué à toutes les factures. */
export const CONDITIONS_PAIEMENT_DEFAUT = 'à 60 jours à compter de la date de facture'

/** Nombre de jours entre l'émission et l'échéance. */
export const DELAI_PAIEMENT_JOURS = 60
