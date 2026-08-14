/**
 * Client Limova — campagnes d'appels sortants (agent téléphonique Tom).
 *
 * Le public de Lab Learning ne lit pas ses mails : 700+ apprenants sans
 * adresse, des gérants debout douze heures par jour. Le téléphone est le canal
 * qui les atteint, et Limova le rend automatisable : relance des
 * questionnaires, confirmation de présence à J-1, récupération des pièces
 * formateurs.
 *
 * Authentification par en-tête `x-api-key` (clé lmv_…, LIMOVA_API_KEY).
 * Chaque requête consomme des crédits du workspace — un solde à zéro répond
 * 402, ce qui est un état normal à gérer, pas une panne.
 *
 * Doc : https://limova.readme.io — base https://api.new.limova.ai
 */

const BASE = 'https://api.new.limova.ai'

export class LimovaError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** 402 : solde de crédits API épuisé — recharger sur new.limova.ai. */
    public readonly creditsEpuises: boolean = status === 402,
  ) {
    super(message)
  }
}

async function requete<T>(chemin: string, init?: RequestInit): Promise<T> {
  const cle = process.env.LIMOVA_API_KEY
  if (!cle) throw new LimovaError(0, 'LIMOVA_API_KEY absente de la configuration')

  const r = await fetch(`${BASE}${chemin}`, {
    ...init,
    headers: {
      'x-api-key': cle,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const corps = await r.text()
  if (!r.ok) {
    let message = `Limova ${r.status}`
    try { message = JSON.parse(corps)?.message || message } catch { /* corps non JSON */ }
    throw new LimovaError(r.status, message)
  }
  return corps ? JSON.parse(corps) : (undefined as T)
}

// ── Campagnes d'appels sortants ─────────────────────────────────────────────

export interface CampagneAppels {
  id: string
  name: string
  status: string
}

export interface DestinataireAppel {
  /** Formats acceptés : 33612345678, +33612345678 ou 0612345678. */
  phoneNumber: string
  firstName?: string
  lastName?: string
  company?: string
}

/**
 * Crée une campagne d'appels. `instructions` est le script de l'agent : il
 * doit toujours se présenter comme un assistant automatique de Lab Learning —
 * la transparence n'est pas négociable sur un canal vocal.
 */
export function creerCampagneAppels(params: {
  name: string
  description?: string
  instructions: string
  language?: string
  voiceId?: string
  phoneNumber?: string
  twilioSid?: string
  maxCallDurationMinutes?: number
}): Promise<CampagneAppels> {
  return requete<CampagneAppels>('/outbound-campaigns', {
    method: 'POST',
    body: JSON.stringify({ language: 'fr', maxCallDurationMinutes: 8, ...params }),
  })
}

export function ajouterDestinataires(
  campagneId: string,
  recipients: DestinataireAppel[],
): Promise<{ message: string; count: number }> {
  return requete(`/outbound-campaigns/${campagneId}/recipients`, {
    method: 'POST',
    body: JSON.stringify({ recipients }),
  })
}

export function demarrerCampagne(campagneId: string): Promise<unknown> {
  return requete(`/outbound-campaigns/${campagneId}/start`, { method: 'POST' })
}

export function suspendreCampagne(campagneId: string): Promise<unknown> {
  return requete(`/outbound-campaigns/${campagneId}/pause`, { method: 'POST' })
}

export function statistiquesCampagne(campagneId: string): Promise<Record<string, unknown>> {
  return requete(`/outbound-campaigns/${campagneId}/statistics`)
}

/**
 * Journaux d'appels d'une campagne : statut, durée, transcription, résumé.
 * C'est ce que le CRM rapatrie pour tracer chaque appel comme un mail —
 * un appel non consigné ne vaut rien à l'audit.
 */
export function journauxAppels(
  campagneId: string,
  page = 1,
  limit = 50,
): Promise<{ data: any[]; total?: number }> {
  return requete(`/outbound-campaigns/${campagneId}/call-logs?page=${page}&limit=${limit}`)
}
