#!/usr/bin/env node
/**
 * Remplit le registre du réseau handicap (ind. 26) avec les contacts
 * VÉRIFIÉS dans les sources publiques officielles du 19/08/2026 :
 *  - Liste officielle Agefiph des contacts RHF (janvier 2026)
 *  - Fiche Carif-Oref Occitanie « contacter les conseillers RHF » (11/03/2026)
 *  - Cap emploi 34 (capemploi-34.com) et MDA/MDPH Hérault (mda.herault.fr)
 *
 * À lancer APRÈS la migration 136. Idempotent : ne duplique pas.
 *
 *   node scripts/remplir-reseau-handicap.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ADMIN = '16a538a0-ca4e-42f1-b2a0-354aea73ca46'
const AUJ = new Date().toISOString().slice(0, 10)

const CONTACTS = [
  {
    region: 'Occitanie', organisme: 'RHF Agefiph',
    prenom: 'Cécile / Juliette / Juhlyana / Valérie', nom: 'MARIN / HERMAN / AMER / DELBREIL',
    telephone: '05 62 47 88 38', email: 'rhf-occitanie@agefiph.asso.fr',
    notes: 'Équipe RHF Occitanie — source : liste officielle Agefiph janv. 2026. Plateforme : occitanie.rhf-accessibilite.fr',
  },
  {
    region: 'Occitanie', organisme: 'RHF Agefiph',
    prenom: 'Aline', nom: 'DUMONT',
    telephone: '06 17 73 58 42', email: 'rhfest-conseil-occitanie@agefiph.asso.fr',
    notes: 'Conseillère appui individuel — territoire EST (dont Hérault). Source : Carif-Oref Occitanie 11/03/2026.',
  },
  {
    region: 'Occitanie', organisme: 'RHF Agefiph',
    prenom: 'Nathalie', nom: 'BAYLE',
    telephone: '06 48 10 95 84', email: 'rhfouest-conseil-occitanie@agefiph.asso.fr',
    notes: 'Conseillère appui individuel — territoire OUEST (Ariège, Gers, Hte-Garonne, Htes-Pyrénées, Lot, Tarn, Tarn-et-Garonne). Source : Carif-Oref 11/03/2026.',
  },
  {
    region: 'Occitanie', organisme: 'Cap emploi',
    prenom: null, nom: null,
    telephone: '04 99 13 34 25', email: 'accueil-m@capemploi34.fr',
    notes: 'Cap emploi 34 — 335 av. du Professeur Viala, 34090 Montpellier. Antenne Béziers : 04 67 62 03 91 / accueil-b@capemploi34.fr. Interlocuteur nominatif à noter au premier échange.',
  },
  {
    region: 'Occitanie', organisme: 'MDPH',
    prenom: null, nom: null,
    telephone: '04 67 67 69 30', email: null,
    notes: "MDA/MDPH de l'Hérault — 1350 rue d'Alco, 34086 Montpellier. Accueil tél. lun-ven 8h30-12h30. mda.herault.fr",
  },
  {
    region: 'National', organisme: 'Agefiph (national)',
    prenom: null, nom: null,
    telephone: '0800 11 10 09', email: null,
    notes: 'Numéro vert Agefiph — orientation vers la RHF régionale et les aides.',
  },
]

const { data: existants, error } = await supabase.from('reseau_handicap')
  .select('organisme, telephone').eq('organization_id', ORG)
if (error) {
  console.error('Table absente — appliquer d’abord la migration 136_reseau_handicap.sql :', error.message)
  process.exit(1)
}
const deja = new Set((existants || []).map((x) => `${x.organisme}|${x.telephone || ''}`))
let inseres = 0
for (const c of CONTACTS) {
  if (deja.has(`${c.organisme}|${c.telephone || ''}`)) continue
  const { error: e } = await supabase.from('reseau_handicap').insert({
    ...c, organization_id: ORG, verifie_le: AUJ, created_by: ADMIN,
  })
  if (e) console.error('  !!', c.organisme, e.message.slice(0, 60))
  else { inseres++; console.log('  +', c.organisme, '—', [c.prenom, c.nom].filter(Boolean).join(' ') || c.telephone) }
}
console.log(`\n${inseres} contacts insérés, tous vérifiés et datés du ${AUJ}.`)
