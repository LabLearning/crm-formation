#!/usr/bin/env node
/**
 * Génère UNE photo par formation publiée sur le site (gpt-image-1), dans un
 * style documentaire cohérent : scène réelle du métier, lumière naturelle,
 * sans texte ni logo. Sauvées en webp dans public/site/formations/<id>.webp
 * + manifeste lib/formations-photos.json (les fiches sans photo retombent
 * sur la photo de thème).
 *
 * Idempotent : une formation dont le fichier existe est sautée.
 *
 *   node scripts/generer-photos-formations.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { execSync } from 'child_process'
config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const CLE = process.env.OPENAI_API_KEY

/** La scène dérive de l'intitulé : chaque formation a SA photo. */
function scene(intitule) {
  const n = intitule.toLowerCase()
  if (n.includes('haccp') || n.includes('hygièn') || n.includes('hygien') || n.includes('salubr')) return "a chef in whites demonstrating hand-washing and surface sanitation to two kitchen employees at a stainless steel prep station, cleaning supplies visible"
  if (n.includes('nettoyage') || n.includes('désinfection') || n.includes('desinfection')) return 'a restaurant employee in gloves deep-cleaning a professional kitchen surface with spray and cloth, cleaning cart nearby'
  if (n.includes('traçab') || n.includes('tracab') || n.includes('étiquet') || n.includes('etiquet')) return 'a kitchen worker labelling prepared food containers with date stickers in a walk-in fridge, clipboard in hand'
  if (n.includes('allerg')) return 'a chef reviewing ingredient packaging carefully with a colleague in a professional kitchen, ingredients laid out'
  if (n.includes('duerp') || (n.includes('prévention') && n.includes('risques')) || n.includes('prevention des risques')) return 'a trainer and a restaurant manager walking through a kitchen pointing at equipment, safety checklist on a clipboard'
  if (n.includes('gestes et postures') || n.includes('tms')) return 'a trainer showing a warehouse-style correct lifting posture to restaurant staff with a delivery crate'
  if (n.includes('sst') || n.includes('secour') || n.includes('sauveteur')) return 'a first-aid training session: trainees practicing on a CPR manikin in a staff room, first-aid kit open'
  if (n.includes('incendie')) return 'an employee practicing with a fire extinguisher outdoors during a workplace fire-safety drill, trainer supervising'
  if (n.includes('chariot')) return 'a worker operating a small forklift in a stockroom, safety vest, trainer observing'
  if (n.includes('bouch')) return 'a butcher in a white apron demonstrating precise knife work on a cut of beef at a butcher counter'
  if (n.includes('charcut')) return 'an artisan preparing charcuterie in a traditional French butcher workshop'
  if (n.includes('boulanger') || n.includes('pain')) return 'a baker shaping baguette dough on a floured wooden bench in an artisan bakery, oven glowing behind'
  if (n.includes('patiss') || n.includes('pâtiss') || n.includes('noël') || n.includes('noel')) return 'a pastry chef piping cream on entremets in a pastry lab, precise hands close-up'
  if (n.includes('pizza')) return 'a pizzaiolo stretching dough by hand in front of a wood-fired oven'
  if (n.includes('barista') || n.includes('café') || n.includes('cafe')) return 'a barista pouring latte art at an espresso machine, steam rising'
  if (n.includes('moules')) return 'a chef preparing moules marinières in a large pot in a busy French coastal restaurant kitchen'
  if (n.includes('équipier') || n.includes('equipier') || n.includes('employé polyvalent') || n.includes('employe polyvalent')) return 'a young fast-food crew member being trained at the counter by a manager, fry station in soft-focus background'
  if (n.includes('accueil client') || n.includes('relation client') || n.includes('posture professionnelle')) return 'a smiling counter employee welcoming a customer in a modern fast-casual restaurant, warm interaction'
  if (n.includes('vente') || n.includes('commercial') || n.includes('fidélisation') || n.includes('fidelisation')) return 'a restaurant owner in conversation with a supplier-consultant over a tablet at a café table, notebook open'
  if (n.includes('rentabilité') || n.includes('rentabilite') || n.includes('coûts') || n.includes('couts') || n.includes('gestion')) return 'a restaurant manager reviewing cost sheets and a calculator at a back-office desk, invoices pinned to a board'
  if (n.includes('conflits') || n.includes('médiation') || n.includes('mediation') || n.includes('communication')) return 'a calm team meeting in a restaurant dining room before service, manager mediating between two employees'
  if (n.includes('manage') || n.includes('leader')) return 'a restaurant manager briefing their team in a kitchen before service, engaged faces'
  if (n.includes('intelligence artificielle') || n.includes(' ia') || n.includes('crm') || n.includes('lms') || n.includes('digital')) return 'a restaurant manager and employee exploring an AI assistant on a laptop in a small back office, warm screen glow'
  if (n.includes('création') || n.includes('creation')) return "an aspiring entrepreneur sketching a business plan at a café table, laptop and croissant beside"
  if (n.includes('sécurité alimentaire') || n.includes('securite alimentaire') || n.includes('maîtrise des risques sanitaires') || n.includes('pms')) return 'a quality manager checking fridge temperatures with a probe thermometer and logging on a clipboard in a professional kitchen'
  return 'a hands-on professional training session in a French food-service workplace, trainer and small group engaged'
}

const { data: formations } = await supabase.from('formations')
  .select('id, intitule').eq('is_active', true).eq('site_publie', true).order('intitule')
mkdirSync('public/site/formations', { recursive: true })

let faites = 0, sautees = 0, erreurs = 0
for (const f of formations || []) {
  const cible = `public/site/formations/${f.id}.webp`
  if (existsSync(cible)) { sautees++; continue }
  const prompt = `Documentary-style photograph: ${scene(f.intitule)}. Set in France. Natural light, candid, shallow depth of field, warm muted tones, photorealistic, high quality. Strictly no visible text, no logos, no brand marks.`
  try {
    const rep = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', quality: 'medium', n: 1 }),
    })
    if (!rep.ok) { erreurs++; console.error('  !!', f.intitule.slice(0, 50), (await rep.text()).slice(0, 140)); continue }
    const json = await rep.json()
    const b64 = json.data?.[0]?.b64_json
    if (!b64) { erreurs++; console.error('  !! pas d image', f.intitule.slice(0, 50)); continue }
    const tmp = `/tmp/photo-formation-${f.id}.png`
    writeFileSync(tmp, Buffer.from(b64, 'base64'))
    execSync(`cwebp -q 78 -resize 1200 0 "${tmp}" -o "${cible}" 2>/dev/null`)
    faites++
    console.log(`  ok (${faites + sautees}/${formations.length})`, f.intitule.slice(0, 60))
  } catch (e) {
    erreurs++
    console.error('  !!', f.intitule.slice(0, 50), String(e).slice(0, 100))
  }
}

// Manifeste : les ids qui ont leur photo — le site retombe sur le thème sinon.
const ids = readdirSync('public/site/formations').filter((n) => n.endsWith('.webp')).map((n) => n.replace('.webp', ''))
writeFileSync('lib/formations-photos.json', JSON.stringify(ids))
console.log(`\nTerminé : ${faites} générées, ${sautees} déjà là, ${erreurs} erreurs — manifeste : ${ids.length} photos.`)
