#!/usr/bin/env node
// Exploration du schéma réel — lecture seule, une ligne par table.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('/Users/brahimouchrif/Projects/crm-lablearning/.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'

for (const table of ['recueils_besoin', 'conventions', 'devis', 'sessions']) {
  const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).eq('organization_id', ORG).limit(1)
  if (error) { console.log(`\n=== ${table} : ERREUR ${error.message}`); continue }
  console.log(`\n=== ${table} (${count} lignes org) ===`)
  if (!data?.length) { console.log('(vide)'); continue }
  console.log(JSON.stringify(data[0], null, 2))
}
