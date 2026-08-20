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

/** La scène dérive de l'intitulé : chaque formation a SA photo.
 *  Style des photos d'origine du site : gros plan sur les mains au travail,
 *  aucun visage, faible profondeur de champ, lumière naturelle de fenêtre. */
function scene(intitule) {
  const n = intitule.toLowerCase()
  if (n.includes('haccp') || n.includes('hygièn') || n.includes('hygien') || n.includes('salubr')) return "hands in blue nitrile gloves scrubbing a stainless steel worktop with soapy foam, water droplets catching the light"
  if (n.includes('nettoyage') || n.includes('désinfection') || n.includes('desinfection')) return 'gloved hands spraying disinfectant mist onto a gleaming steel kitchen surface, microfiber cloth in the other hand'
  if (n.includes('traçab') || n.includes('tracab') || n.includes('étiquet') || n.includes('etiquet')) return 'hands pressing a blank date label onto a clear food storage container, stacked prep containers softly blurred behind'
  if (n.includes('allerg')) return 'hands sorting fresh ingredients into separate glass bowls on a marble counter — nuts, flour, eggs kept apart'
  if (n.includes('duerp') || (n.includes('prévention') && n.includes('risques')) || n.includes('prevention des risques')) return 'a hand ticking a checklist on a clipboard resting on a stainless kitchen counter, blurred kitchen equipment behind'
  if (n.includes('gestes et postures') || n.includes('tms')) return 'strong hands gripping the handles of a heavy delivery crate close to the body, knees bent, warehouse light behind'
  if (n.includes('sst') || n.includes('secour') || n.includes('sauveteur')) return 'hands performing chest compressions on a CPR training manikin, first-aid kit open beside, no faces'
  if (n.includes('incendie')) return 'two hands gripping a red fire extinguisher, one squeezing the lever, a soft cloud of white powder just released'
  if (n.includes('chariot')) return 'hands on the controls and small steering wheel of a forklift, pallet racking softly blurred beyond the windshield'
  if (n.includes('bouch')) return 'a butcher\'s hands slicing a marbled cut of beef with a chef\'s knife on a wooden block, sunlight from a window'
  if (n.includes('charcut')) return 'artisan hands tying a cured sausage with butcher\'s twine on a rustic wooden table, terrines blurred behind'
  if (n.includes('boulanger') || n.includes('pain')) return 'flour-dusted hands folding baguette dough on a wooden bench, flour hanging in the warm light'
  if (n.includes('patiss') || n.includes('pâtiss') || n.includes('noël') || n.includes('noel')) return 'a pastry chef\'s hands piping cream rosettes onto a glossy entremet, piping bag in sharp focus'
  if (n.includes('pizza')) return 'hands stretching pizza dough in the air over a floured marble counter, wood-fired oven glow blurred behind'
  if (n.includes('barista') || n.includes('café') || n.includes('cafe')) return 'hands pouring latte art from a steel pitcher into a ceramic cup on an espresso machine tray, steam rising'
  if (n.includes('moules')) return 'hands tossing glistening mussels in a large steel pot, steam and herbs, coastal window light'
  if (n.includes('équipier') || n.includes('equipier') || n.includes('employé polyvalent') || n.includes('employe polyvalent')) return 'hands assembling a burger on a steel prep counter, brioche bun and fresh toppings in sharp focus, fry station bokeh behind'
  if (n.includes('accueil client') || n.includes('relation client') || n.includes('posture professionnelle')) return 'a hand offering a paper coffee cup across a warm wooden counter to a customer\'s open hand, café bokeh behind'
  if (n.includes('vente') || n.includes('commercial') || n.includes('fidélisation') || n.includes('fidelisation')) return 'a firm handshake over a café table with an open notebook and espresso cups, warm daylight'
  if (n.includes('rentabilité') || n.includes('rentabilite') || n.includes('coûts') || n.includes('couts') || n.includes('gestion')) return 'hands over a calculator and blank receipts on a wooden desk, warm desk lamp glow, shallow focus'
  if (n.includes('conflits') || n.includes('médiation') || n.includes('mediation') || n.includes('communication')) return 'two pairs of hands open in conversation across a wooden table with two coffee cups, soft window light'
  if (n.includes('manage') || n.includes('leader')) return 'a hand moving a magnet on a kitchen planning board, chef jackets hanging blurred in the background'
  if (n.includes('intelligence artificielle') || n.includes(' ia') || n.includes('crm') || n.includes('lms') || n.includes('digital')) return 'hands typing on a laptop on a rustic café table, abstract glowing interface softly blurred on screen, espresso beside'
  if (n.includes('création') || n.includes('creation')) return 'hands sketching a floor plan in a notebook beside a laptop and croissant, morning window light'
  if (n.includes('sécurité alimentaire') || n.includes('securite alimentaire') || n.includes('maîtrise des risques sanitaires') || n.includes('pms')) return 'a hand holding a digital probe thermometer into fresh produce, cold fridge light, condensation droplets'
  return 'skilled hands at work on a professional kitchen counter, tools of the trade in sharp focus, warm natural light'
}

const { data: formations } = await supabase.from('formations')
  .select('id, intitule').eq('is_active', true).eq('site_publie', true).order('intitule')
mkdirSync('public/site/formations', { recursive: true })

let faites = 0, sautees = 0, erreurs = 0
for (const f of formations || []) {
  const cible = `public/site/formations/${f.id}.webp`
  if (existsSync(cible)) { sautees++; continue }
  const prompt = `Editorial close-up photograph: ${scene(f.intitule)}. Tight framing on the hands and the subject, no face visible, very shallow depth of field, bright natural window light, crisp texture detail, warm golden tones, photorealistic, high-end food magazine quality. Strictly no visible text, no logos, no brand marks.`
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
