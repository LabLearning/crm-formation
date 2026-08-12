/**
 * Compare ce que le code sélectionne avec ce qui existe réellement en base.
 *
 * PostgREST rejette la requête ENTIÈRE dès qu'une colonne est inconnue : une
 * colonne fantôme ne dégrade pas l'affichage, elle fait disparaître
 * l'enregistrement. Le symptôme observé — « introuvable » alors que la ligne
 * existe — ne ressemble jamais à sa cause.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const env = readFileSync('.env.local','utf8')
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1], env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1])

const fichiers = []
const parcourir = (d) => {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e === '.next' || e.startsWith('.')) continue
    const p = join(d, e)
    if (statSync(p).isDirectory()) parcourir(p)
    else if (/\.(ts|tsx)$/.test(e)) fichiers.push(p)
  }
}
parcourir('app'); parcourir('lib')

// .from('table')…select('a, b, rel:fk(x)')
const paires = new Map()   // "table.colonne" -> fichiers
for (const f of fichiers) {
  const src = readFileSync(f, 'utf8')
  const re = /\.from\(\s*['"`]([a-z_]+)['"`]\s*\)([\s\S]{0,400}?)\.select\(\s*([`'"])([\s\S]*?)\3/g
  let m
  while ((m = re.exec(src))) {
    const table = m[1]
    let cols = m[4]
    if (cols.includes('${')) continue                 // sélection dynamique
    cols = cols.replace(/\([^()]*\)/g, '')            // retire le contenu des relations
    for (let c of cols.split(',')) {
      c = c.trim().split(':')[0].trim()
      if (!c || c === '*' || !/^[a-z_][a-z0-9_]*$/.test(c)) continue
      const cle = `${table}.${c}`
      if (!paires.has(cle)) paires.set(cle, new Set())
      paires.get(cle).add(f)
    }
  }
}

console.log(`${paires.size} couples table.colonne référencés dans ${fichiers.length} fichiers\n`)

const manquantes = []
const tablesAbsentes = new Set()
for (const [cle, fs] of paires) {
  const [table, col] = cle.split('.')
  if (tablesAbsentes.has(table)) continue
  const { error } = await supabase.from(table).select(col).limit(1)
  if (!error) continue
  if (/relation .* does not exist|Could not find the table/i.test(error.message)) { tablesAbsentes.add(table); continue }
  if (/column .* does not exist|Could not find the '.*' column/i.test(error.message)) {
    manquantes.push({ cle, fichiers: [...fs] })
  }
}

if (tablesAbsentes.size) console.log('Tables inconnues (souvent des vues ou des noms dynamiques) :', [...tablesAbsentes].join(', '), '\n')

if (!manquantes.length) { console.log('Aucune colonne fantôme.'); process.exit(0) }
console.log(`${manquantes.length} COLONNE(S) FANTÔME(S) — la requête entière échoue :\n`)
for (const m of manquantes) {
  console.log(`  ${m.cle}`)
  for (const f of m.fichiers.slice(0, 4)) console.log(`      ${f}`)
}
