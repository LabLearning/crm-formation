import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const DRY=process.argv[2]!=='apply'
const env={};for(const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim()}
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const ORG='ff747dfe-c034-44d8-98d7-e53892263fb5',USER='16a538a0-ca4e-42f1-b2a0-354aea73ca46'
const SP='/private/tmp/claude-501/-Users-brahimouchrif-Projects-crm-lablearning/04d3a660-0bb5-4829-a5e1-685cc8491e7f/scratchpad/'
const mont=JSON.parse(readFileSync(SP+'akto_montants.json'))
const clean=s=>String(s||'').toUpperCase().replace(/Œ/g,'OE').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\b(SARL|SASU|SAS|SA|EURL|SNC|SCI)\b/g,' ').replace(/[^A-Z0-9]/g,'')
const {data:clients}=await sb.from('clients').select('id,raison_sociale,nom_commercial,siret').eq('organization_id',ORG)
const bySiret=new Map();for(const c of clients||[]){if(c.siret)bySiret.set(String(c.siret).replace(/\D/g,''),c)}
const byName=(clients||[]).map(c=>({...c,k:clean(c.nom_commercial||c.raison_sociale)}))
const findCli=d=>{const s=String(d.siret).replace(/\D/g,'');if(bySiret.has(s))return bySiret.get(s);const k=clean(d.client);return byName.find(c=>c.k&&k&&(c.k.includes(k)||k.includes(c.k))&&Math.min(c.k.length,k.length)>=4)}
// factures CRM 2026 non payées
let fac=[];for(let f=0;;f+=1000){const{data}=await sb.from('factures').select('id,numero,status,date_emission,montant_ht,montant_paye,client_id,numero_prise_en_charge').eq('organization_id',ORG).range(f,f+999);if(!data||!data.length)break;fac.push(...data);if(data.length<1000)break}
const open=fac.filter(f=>['en_retard','emise','brouillon'].includes(f.status)&&Number(f.montant_ht||0)>0)
console.log((DRY?'DRY — ':'')+'factures CRM ouvertes (>0€):',open.length,'|',open.reduce((s,f)=>s+Number(f.montant_ht),0).toFixed(2),'€')
const a26=mont.filter(d=>!['Refusé','Annulé'].includes(d.etat)&&d.debut.startsWith('2026')&&d.regle>0)
console.log('dossiers AKTO 2026 réglés:',a26.length,'|',a26.reduce((s,d)=>s+d.regle,0).toFixed(2),'€')
const used=new Set();let upd=0,pai=0,noMatch=0
for(const d of a26){
  const cli=findCli(d); if(!cli){noMatch++;continue}
  // facture même client + montant identique (tolérance 1€)
  const hit=open.find(f=>!used.has(f.id)&&f.client_id===cli.id&&Math.abs(Number(f.montant_ht)-d.facture)<1)
  if(!hit){noMatch++;continue}
  used.add(hit.id);upd++
  if(DRY){if(upd<=6)console.log(`  ~ ${hit.numero} ${(cli.nom_commercial||cli.raison_sociale).slice(0,18).padEnd(20)} ${String(hit.montant_ht).padStart(8)}€ ${hit.status} -> payee (AKTO ${d.dossier})`);continue}
  const {error}=await sb.from('factures').update({status:d.regle>=d.facture?'payee':'emise',montant_paye:d.regle,
    montant_restant:Math.max(0,Number(hit.montant_ht)-d.regle),date_paiement_complet:d.regle>=d.facture?(d.fin||d.debut):null,
    financeur_type:'opco',financeur_nom:'AKTO',numero_prise_en_charge:d.dossier,subrogation:true}).eq('id',hit.id)
  if(error){console.log('  ERR',hit.numero,error.message.slice(0,60));continue}
  const {data:exP}=await sb.from('paiements').select('id').eq('facture_id',hit.id).maybeSingle()
  if(!exP){const{error:ep}=await sb.from('paiements').insert({organization_id:ORG,facture_id:hit.id,montant:d.regle,mode:'virement',status:'valide',date_paiement:d.fin||d.debut,reference:`AKTO ${d.dossier}`,payeur_nom:'AKTO',payeur_type:'opco',notes:'Règlement OPCO (export AKTO).',created_by:USER});if(!ep)pai++}
}
console.log(`\n${DRY?'SERAIENT mises à jour':'MISES À JOUR'}: ${upd} factures | ${pai} paiements | non rapprochés: ${noMatch}`)
