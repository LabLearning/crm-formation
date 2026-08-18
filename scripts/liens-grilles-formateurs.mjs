#!/usr/bin/env node
/**
 * Liens « grilles de saisie » par formateur.
 *
 * Chaque formateur actif reçoit (s'il ne l'a pas déjà) son token de portail,
 * et le script sort la liste des liens /portail/<token>/grilles — la page où
 * il remplit les questionnaires de ses stagiaires, enregistrés directement
 * dans le CRM. La distribution des liens reste à la main de l'admin :
 * AUCUN mail ne part d'ici.
 *
 * USAGE : node scripts/liens-grilles-formateurs.mjs           (simulation)
 *         node scripts/liens-grilles-formateurs.mjs --ecrire  (crée les tokens manquants et liste les liens)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const APP = 'https://crm.lab-learning.fr'

const [{ data: formateurs }, { data: tokens }] = await Promise.all([
  supabase.from('formateurs').select('id, prenom, nom, email').eq('organization_id', ORG).eq('is_active', true).order('nom'),
  supabase.from('portal_access_tokens').select('id, formateur_id, token, is_active').eq('type', 'formateur').eq('organization_id', ORG),
])
const tokenPar = new Map((tokens || []).filter((t) => t.is_active).map((t) => [t.formateur_id, t.token]))

let crees = 0
for (const f of formateurs || []) {
  if (tokenPar.has(f.id)) continue
  crees++
  if (!ECRIRE) { console.log(`  token à créer : ${f.prenom} ${f.nom}`); continue }
  const { data, error } = await supabase.from('portal_access_tokens').insert({
    organization_id: ORG, type: 'formateur', formateur_id: f.id, email: f.email || null, is_active: true,
  }).select('token').single()
  if (error) { console.error(`  !! ${f.nom}: ${error.message.slice(0, 70)}`); continue }
  tokenPar.set(f.id, data.token)
}

console.log(`${ECRIRE ? 'Tokens créés' : 'Tokens à créer'} : ${crees}\n`)
if (ECRIRE) {
  console.log('— Liens grilles par formateur (à distribuer toi-même) :\n')
  for (const f of formateurs || []) {
    const t = tokenPar.get(f.id)
    if (t) console.log(`${(f.prenom + ' ' + f.nom).padEnd(30)} ${f.email || '(pas d\'email)'}\n  ${APP}/portail/${t}/grilles\n`)
  }
} else console.log('Relancer avec --ecrire pour créer les tokens et lister les liens.')
