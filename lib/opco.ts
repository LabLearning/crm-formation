/**
 * Service OPCO — auto-détection de l'OPCO d'une entreprise
 * depuis son code NAF ou son code IDCC (convention collective).
 *
 * Source: table `opco` + tables de mapping `opco_naf_codes` et `opco_idcc_codes`
 * (migration 017_opco_mapping.sql).
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface Opco {
  id: string
  code: string
  nom: string
  nom_complet: string | null
  site_web: string | null
  description: string | null
}

export interface OpcoMatch {
  opco: Opco
  matched_by: 'naf' | 'idcc'
  matched_code: string
  libelle: string | null
}

export const OPCO_COMPTE_STATUS_LABELS = {
  aucun: 'Aucun compte',
  courrier_envoye: 'Courrier envoyé',
  en_attente_validation: 'En attente de validation',
  actif: 'Actif',
  inactif: 'Inactif',
} as const

export type OpcoCompteStatus = keyof typeof OPCO_COMPTE_STATUS_LABELS

/** Liste tous les OPCOs (pour le dropdown manuel) */
export async function listOpcos(): Promise<Opco[]> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('opco').select('*').eq('is_active', true).order('nom')
  return (data as Opco[]) || []
}

/** Trouve l'OPCO depuis un code NAF (ex: "56.10A") */
export async function findOpcoByNaf(codeNaf: string): Promise<OpcoMatch | null> {
  const code = codeNaf.trim()
  if (!code) return null
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('opco_naf_codes')
    .select('libelle, opco:opco(*)')
    .eq('code_naf', code)
    .maybeSingle()
  if (!data?.opco) return null
  return { opco: data.opco as unknown as Opco, matched_by: 'naf', matched_code: code, libelle: data.libelle }
}

/** Trouve l'OPCO depuis un code IDCC (ex: "1979" pour HCR) */
export async function findOpcoByIdcc(codeIdcc: string): Promise<OpcoMatch | null> {
  const code = codeIdcc.trim()
  if (!code) return null
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('opco_idcc_codes')
    .select('libelle_convention, opco:opco(*)')
    .eq('code_idcc', code)
    .maybeSingle()
  if (!data?.opco) return null
  return { opco: data.opco as unknown as Opco, matched_by: 'idcc', matched_code: code, libelle: data.libelle_convention }
}

/** Tente une détection : IDCC en priorité (plus précis), fallback NAF */
export async function detectOpco(opts: { codeIdcc?: string | null; codeNaf?: string | null }): Promise<OpcoMatch | null> {
  if (opts.codeIdcc) {
    const m = await findOpcoByIdcc(opts.codeIdcc)
    if (m) return m
  }
  if (opts.codeNaf) {
    const m = await findOpcoByNaf(opts.codeNaf)
    if (m) return m
  }
  return null
}
