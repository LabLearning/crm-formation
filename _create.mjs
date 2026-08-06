import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const DRY = process.argv[2] !== 'apply'
const env={};for(const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim()}
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const ORG='ff747dfe-c034-44d8-98d7-e53892263fb5', USER='16a538a0-ca4e-42f1-b2a0-354aea73ca46'
const SP='/private/tmp/claude-501/-Users-brahimouchrif-Projects-crm-lablearning/04d3a660-0bb5-4829-a5e1-685cc8491e7f/scratchpad/'
const miss=JSON.parse(readFileSync(SP+'akto_missing.json'))
const stag=JSON.parse(readFileSync(SP+'akto_stagiaires.json'))
const clean=s=>String(s||'').toUpperCase().replace(/Œ/g,'OE').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\b(SARL|SASU|SAS|SA|EURL|SNC|SCI)\b/g,' ').replace(/[^A-Z0-9]/g,'')
const {data:clients}=await sb.from('clients').select('id,raison_sociale,nom_commercial,siret').eq('organization_id',ORG)
const bySiret=new Map();for(const c of clients||[]){if(c.siret)bySiret.set(String(c.siret).replace(/\D/g,''),c)}
const byName=(clients||[]).map(c=>({...c,k:clean(c.nom_commercial||c.raison_sociale)}))
const {data:forms}=await sb.from('formations').select('id,intitule,duree_heures').eq('organization_id',ORG)
const fIdx=(forms||[]).map(f=>({...f,k:clean(f.intitule)}))
const findCli=d=>{const s=String(d.siret).replace(/\D/g,'');if(bySiret.has(s))return bySiret.get(s);const k=clean(d.client);return byName.find(c=>c.k&&k&&(c.k.includes(k)||k.includes(c.k))&&Math.min(c.k.length,k.length)>=4)}
const findForm=t=>{const k=clean(t);let best=null,sc=0
  for(const f of fIdx){if(!f.k)continue;let s=0
    if(f.k===k)s=100;else if(f.k.includes(k)||k.includes(f.k))s=80-Math.abs(f.k.length-k.length)/10
    else{const a=k.slice(0,16);if(a.length>8&&f.k.includes(a))s=60}
    if(s>sc){sc=s;best=f}}
  return sc>=55?best:null}
const all=[...miss['2025'].miss,...miss['2025'].noCli,...miss['2026'].miss,...miss['2026'].noCli]
console.log(DRY?'=== DRY RUN ===':'=== CRÉATION ===','dossiers à traiter:',all.length)
let created=0,skipped=0,noForm=0,noCli=0,inscTot=0
for(const d of all){
  const cli=findCli(d)
  if(!cli){noCli++;console.log('  ⚠ client introuvable:',d.client,d.dossier);continue}
  const f=findForm(d.intitule)
  if(!f){noForm++;console.log('  ⚠ formation non mappée:',d.intitule.slice(0,50),'|',d.dossier);continue}
  // déjà créée ?
  const {data:ex}=await sb.from('sessions').select('id').eq('organization_id',ORG).eq('reference',d.dossier).maybeSingle()
  if(ex){skipped++;continue}
  const st=stag[d.dossier]||[]
  const row={organization_id:ORG,reference:d.dossier,formation_id:f.id,client_id:cli.id,
    intitule:d.intitule.slice(0,200),date_debut:d.debut,date_fin:d.fin||d.debut,
    status:'terminee',places_max:Math.max(st.length,Number(d.stagiaires)||1,1),
    notes_internes:`Session reconstituée depuis l'export AKTO (dossier ${d.dossier}, état ${d.etat}).`,
    created_by:USER}
  if(DRY){created++;inscTot+=st.length;if(created<=8)console.log(`  + ${d.debut} ${d.dossier} ${(cli.nom_commercial||cli.raison_sociale).slice(0,20).padEnd(22)} -> ${f.intitule.slice(0,38)} (${st.length} stag)`);continue}
  const {data:sess,error}=await sb.from('sessions').insert(row).select('id').single()
  if(error){console.log('  ERR session',d.dossier,error.message.slice(0,70));continue}
  created++
  // stagiaires
  for(const p of st){
    const nom=p.nom.trim(),prenom=p.prenom.trim();if(!nom&&!prenom)continue
    const {data:exA}=await sb.from('apprenants').select('id').eq('organization_id',ORG).eq('client_id',cli.id).ilike('nom',nom).ilike('prenom',prenom).maybeSingle()
    let aid=exA?.id
    if(!aid){const{data:na,error:ea}=await sb.from('apprenants').insert({organization_id:ORG,client_id:cli.id,nom,prenom,entreprise:cli.nom_commercial||cli.raison_sociale}).select('id').single();if(ea)continue;aid=na.id}
    const {error:ei}=await sb.from('inscriptions').insert({organization_id:ORG,session_id:sess.id,apprenant_id:aid,status:'inscrit'})
    if(!ei)inscTot++
  }
}
console.log(`\n${DRY?'SERAIENT créées':'CRÉÉES'}: ${created} sessions | ${inscTot} inscriptions | déjà présentes: ${skipped} | formation non mappée: ${noForm} | client introuvable: ${noCli}`)
